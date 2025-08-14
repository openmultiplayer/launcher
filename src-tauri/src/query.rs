use actix_web::web::Buf;
use byteorder::{LittleEndian, ReadBytesExt};
use once_cell::sync::Lazy;
use regex::Regex;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::io::{Cursor, Read};
use std::sync::{Arc, Mutex};
use std::time::{SystemTime, UNIX_EPOCH};
use std::{net::Ipv4Addr, time::Duration};
use tokio::net::{lookup_host, UdpSocket};
use tokio::time::timeout_at;
use tokio::time::Instant;

use crate::{constants::*, errors::*, helpers};

static OMP_EXTRA_INFO_LAST_UPDATE_LIST: Lazy<Mutex<HashMap<String, u64>>> =
    Lazy::new(|| Mutex::new(HashMap::new()));

static QUERY_RATE_LIMIT_LIST: Lazy<Mutex<HashMap<String, u64>>> =
    Lazy::new(|| Mutex::new(HashMap::new()));

static CACHED_QUERY: Lazy<tokio::sync::Mutex<Option<(Query, String)>>> =
    Lazy::new(|| tokio::sync::Mutex::new(None));

pub struct Query {
    address: Ipv4Addr,
    port: i32,
    socket: UdpSocket,
}

#[derive(Serialize, Deserialize, Default)]
pub struct InfoPacket {
    pub password: bool,
    pub players: u16,
    pub max_players: u16,
    pub hostname: String,
    pub gamemode: String,
    pub language: String,
}

#[derive(Serialize, Deserialize, Clone, Default)]
pub struct Player {
    pub name: String,
    pub score: i32,
}

#[derive(Serialize, Deserialize, Clone, Default)]
pub struct ExtraInfoPacket {
    pub discord_link: String,
    pub light_banner_url: String,
    pub dark_banner_url: String,
    pub logo_url: String,
}

#[derive(Serialize, Deserialize, Clone, Default)]
pub struct ServerQueryResponse {
    pub info: Option<String>,
    pub extra_info: Option<String>,
    pub players: Option<String>,
    pub rules: Option<String>,
    pub ping: Option<u32>,
}

#[derive(Serialize, Deserialize, Clone, Default)]
pub struct ErrorResponse {
    pub info: String,
    pub error: bool,
}

impl Query {
    pub async fn new(addr: &str, port: i32) -> Result<Self> {
        let regex = Regex::new(r"^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$")
            .map_err(|e| LauncherError::Parse(format!("Invalid regex pattern: {}", e)))?;

        let address = match regex.captures(addr) {
            Some(_) => {
                // it's valid ipv4, move on
                addr.to_string()
            }
            None => {
                let socket_addresses = lookup_host(format!("{}:{}", addr, port)).await;
                match socket_addresses {
                    Ok(s) => {
                        let mut ipv4 = "".to_string();
                        for socket_address in s {
                            if socket_address.is_ipv4() {
                                // hostname is resolved to ipv4:port, lets split it by ":" and get ipv4 only
                                let ip_port = socket_address.to_string();
                                let vec: Vec<&str> = ip_port.split(':').collect();
                                if !vec.is_empty() {
                                    ipv4 = vec[0].to_string();
                                    break;
                                }
                            }
                        }
                        if ipv4.is_empty() {
                            return Err(LauncherError::NotFound(
                                "No IPv4 address found for hostname".to_string(),
                            ));
                        }
                        ipv4
                    }
                    Err(e) => {
                        return Err(LauncherError::Network(format!(
                            "Failed to resolve hostname: {}",
                            e
                        )));
                    }
                }
            }
        };

        let parsed_address = address
            .parse::<Ipv4Addr>()
            .map_err(|e| LauncherError::InvalidInput(format!("Invalid IP address: {}", e)))?;

        let socket = UdpSocket::bind("0.0.0.0:0")
            .await
            .map_err(|e| LauncherError::Network(format!("Failed to bind socket: {}", e)))?;

        socket
            .connect(format!("{}:{}", addr, port))
            .await
            .map_err(|e| LauncherError::Network(format!("Failed to connect to server: {}", e)))?;

        let data = Self {
            address: parsed_address,
            port,
            socket,
        };

        Ok(data)
    }

    pub async fn send(&self, query_type: char) -> Result<usize> {
        let mut packet: Vec<u8> = Vec::new();
        packet.extend_from_slice(SAMP_PACKET_HEADER);
        for i in 0..4 {
            packet.push(self.address.octets()[i]);
        }
        packet.push((self.port & 0xFF) as u8);
        packet.push((self.port >> 8 & 0xFF) as u8);
        packet.push(query_type as u8);

        if query_type == 'p' {
            packet.push(0);
            packet.push(0);
            packet.push(0);
            packet.push(0);
        }

        let amt = self
            .socket
            .send(&packet)
            .await
            .map_err(|e| LauncherError::Network(format!("Failed to send packet: {}", e)))?;
        Ok(amt)
    }

    pub async fn recv(&self) -> Result<String> {
        let mut buf = [0; UDP_BUFFER_SIZE];
        let amt = match timeout_at(
            Instant::now() + Duration::from_secs(QUERY_TIMEOUT_SECS),
            self.socket.recv(&mut buf),
        )
        .await
        .map_err(|_| LauncherError::Network("Query timeout".to_string()))?
        {
            Ok(n) => n,
            Err(e) => return Err(LauncherError::from(e)),
        };

        if amt == 0 {
            return Err(LauncherError::Network("No data received".to_string()));
        }

        let query_type = buf[10] as char;
        let packet = Cursor::new(buf[11..amt].to_vec());
        match query_type {
            QUERY_TYPE_INFO => self.build_info_packet(packet),
            QUERY_TYPE_PLAYERS => self.build_players_packet(packet),
            QUERY_TYPE_RULES => self.build_rules_packet(packet),
            QUERY_TYPE_EXTRA_INFO => self.build_extra_info_packet(packet),
            QUERY_TYPE_PING => Ok(String::from("pong")),
            _ => Err(LauncherError::Network("Unknown query type".to_string())),
        }
    }

    fn build_info_packet(&self, mut packet: Cursor<Vec<u8>>) -> Result<String> {
        let password = packet
            .read_i8()
            .map_err(|e| LauncherError::Parse(format!("Failed to read password flag: {}", e)))?
            != 0;
        let players = packet
            .read_u16::<LittleEndian>()
            .map_err(|e| LauncherError::Parse(format!("Failed to read players count: {}", e)))?;
        let max_players = packet
            .read_u16::<LittleEndian>()
            .map_err(|e| LauncherError::Parse(format!("Failed to read max players: {}", e)))?;

        let mut data = InfoPacket {
            password,
            players,
            max_players,
            ..Default::default()
        };

        let hostname_len = packet
            .read_u32::<LittleEndian>()
            .map_err(|e| LauncherError::Parse(format!("Failed to read hostname length: {}", e)))?;
        if hostname_len > MAX_HOSTNAME_LENGTH {
            return Err(LauncherError::InvalidInput(
                "Hostname length exceeds maximum".to_string(),
            ));
        }
        let mut hostname_buf = vec![0u8; hostname_len as usize];
        packet
            .read_exact(&mut hostname_buf)
            .map_err(|e| LauncherError::Parse(format!("Failed to read hostname: {}", e)))?;
        data.hostname = helpers::decode_buffer(hostname_buf).0;

        let gamemode_len = packet
            .read_u32::<LittleEndian>()
            .map_err(|e| LauncherError::Parse(format!("Failed to read gamemode length: {}", e)))?;
        if gamemode_len > MAX_GAMEMODE_LENGTH {
            return Err(LauncherError::InvalidInput(
                "Gamemode length exceeds maximum".to_string(),
            ));
        }
        let mut gamemode_buf = vec![0u8; gamemode_len as usize];
        packet
            .read_exact(&mut gamemode_buf)
            .map_err(|e| LauncherError::Parse(format!("Failed to read gamemode: {}", e)))?;
        data.gamemode = helpers::decode_buffer(gamemode_buf).0;

        let language_len = packet
            .read_u32::<LittleEndian>()
            .map_err(|e| LauncherError::Parse(format!("Failed to read language length: {}", e)))?;
        if language_len > MAX_LANGUAGE_LENGTH {
            return Err(LauncherError::InvalidInput(
                "Language length exceeds maximum".to_string(),
            ));
        }
        let mut language_buf = vec![0u8; language_len as usize];
        packet
            .read_exact(&mut language_buf)
            .map_err(|e| LauncherError::Parse(format!("Failed to read language: {}", e)))?;
        data.language = helpers::decode_buffer(language_buf).0;

        serde_json::to_string(&data).map_err(|e| LauncherError::SerdeJson(e).into())
    }

    fn build_extra_info_packet(&self, mut packet: Cursor<Vec<u8>>) -> Result<String> {
        let mut data = ExtraInfoPacket::default();

        let discord_link_len = packet.read_u32::<LittleEndian>().map_err(|e| {
            LauncherError::Parse(format!("Failed to read discord link length: {}", e))
        })?;
        if discord_link_len > MAX_DISCORD_LINK_LENGTH {
            return Err(LauncherError::InvalidInput(
                "Discord link length exceeds maximum".to_string(),
            ));
        }
        let mut discord_link_buf = vec![0u8; discord_link_len as usize];
        packet
            .read_exact(&mut discord_link_buf)
            .map_err(|e| LauncherError::Parse(format!("Failed to read discord link: {}", e)))?;
        data.discord_link = helpers::decode_buffer(discord_link_buf).0;

        let banner_url_len = packet.read_u32::<LittleEndian>().map_err(|e| {
            LauncherError::Parse(format!("Failed to read light banner URL length: {}", e))
        })?;
        if banner_url_len > MAX_BANNER_URL_LENGTH {
            return Err(LauncherError::InvalidInput(
                "Light banner URL length exceeds maximum".to_string(),
            ));
        }
        let mut banner_url_buf = vec![0u8; banner_url_len as usize];
        packet
            .read_exact(&mut banner_url_buf)
            .map_err(|e| LauncherError::Parse(format!("Failed to read light banner URL: {}", e)))?;
        data.light_banner_url = helpers::decode_buffer(banner_url_buf).0;

        let dark_banner_url_len = packet.read_u32::<LittleEndian>().map_err(|e| {
            LauncherError::Parse(format!("Failed to read dark banner URL length: {}", e))
        })?;
        if dark_banner_url_len > MAX_BANNER_URL_LENGTH {
            return Err(LauncherError::InvalidInput(
                "Dark banner URL length exceeds maximum".to_string(),
            ));
        }
        let mut dark_banner_url_buf = vec![0u8; dark_banner_url_len as usize];
        packet
            .read_exact(&mut dark_banner_url_buf)
            .map_err(|e| LauncherError::Parse(format!("Failed to read dark banner URL: {}", e)))?;
        data.dark_banner_url = helpers::decode_buffer(dark_banner_url_buf).0;

        if packet.remaining() > 4 {
            let logo_url_len = packet.read_u32::<LittleEndian>().map_err(|e| {
                LauncherError::Parse(format!("Failed to read logo URL length: {}", e))
            })?;
            if logo_url_len > MAX_LOGO_URL_LENGTH {
                return Err(LauncherError::InvalidInput(
                    "Logo URL length exceeds maximum".to_string(),
                ));
            }
            if packet.remaining() >= logo_url_len as usize {
                let mut logo_url_buf = vec![0u8; logo_url_len as usize];
                packet
                    .read_exact(&mut logo_url_buf)
                    .map_err(|e| LauncherError::Parse(format!("Failed to read logo URL: {}", e)))?;
                data.logo_url = helpers::decode_buffer(logo_url_buf).0;
            }
        }

        serde_json::to_string(&data).map_err(|e| LauncherError::SerdeJson(e).into())
    }

    fn build_players_packet(&self, mut packet: Cursor<Vec<u8>>) -> Result<String> {
        let player_count = packet
            .read_u16::<LittleEndian>()
            .map_err(|e| LauncherError::Parse(format!("Failed to read player count: {}", e)))?;

        if player_count > MAX_PLAYER_COUNT {
            return Err(LauncherError::InvalidInput(
                "Player count exceeds maximum".to_string(),
            ));
        }

        let default_player = Player::default();
        let mut players = vec![default_player; player_count as usize];

        for i in 0..player_count {
            let player = &mut players[i as usize];

            let player_name_len = packet.read_u8().map_err(|e| {
                LauncherError::Parse(format!(
                    "Failed to read player name length for player {}: {}",
                    i, e
                ))
            })?;

            let mut player_name_buf = vec![0u8; player_name_len as usize];
            packet.read_exact(&mut player_name_buf).map_err(|e| {
                LauncherError::Parse(format!(
                    "Failed to read player name for player {}: {}",
                    i, e
                ))
            })?;
            player.name = helpers::decode_buffer(player_name_buf).0;

            player.score = packet.read_i32::<LittleEndian>().map_err(|e| {
                LauncherError::Parse(format!("Failed to read score for player {}: {}", i, e))
            })?;
        }

        serde_json::to_string(&players).map_err(|e| LauncherError::SerdeJson(e).into())
    }

    fn build_rules_packet(&self, mut packet: Cursor<Vec<u8>>) -> Result<String> {
        let rule_count = packet
            .read_u16::<LittleEndian>()
            .map_err(|e| LauncherError::Parse(format!("Failed to read rule count: {}", e)))?;

        if rule_count > MAX_RULE_COUNT {
            return Err(LauncherError::InvalidInput(
                "Rule count exceeds maximum".to_string(),
            ));
        }

        let mut rules: Vec<Vec<String>> = Vec::new();

        for i in 0..rule_count {
            let mut rule: Vec<String> = Vec::new();

            let rule_name_len = packet.read_u8().map_err(|e| {
                LauncherError::Parse(format!(
                    "Failed to read rule name length for rule {}: {}",
                    i, e
                ))
            })?;

            let mut rule_name_buf = vec![0u8; rule_name_len as usize];
            packet.read_exact(&mut rule_name_buf).map_err(|e| {
                LauncherError::Parse(format!("Failed to read rule name for rule {}: {}", i, e))
            })?;
            rule.push(helpers::decode_buffer(rule_name_buf).0);

            let rule_value_len = packet.read_u8().map_err(|e| {
                LauncherError::Parse(format!(
                    "Failed to read rule value length for rule {}: {}",
                    i, e
                ))
            })?;

            let mut rule_value_buf = vec![0u8; rule_value_len as usize];
            packet.read_exact(&mut rule_value_buf).map_err(|e| {
                LauncherError::Parse(format!("Failed to read rule value for rule {}: {}", i, e))
            })?;
            rule.push(helpers::decode_buffer(rule_value_buf).0);

            rules.push(rule);
        }

        serde_json::to_string(&rules).map_err(|e| LauncherError::SerdeJson(e).into())
    }
}

#[tauri::command]
pub async fn query_server(
    ip: &str,
    port: i32,
    info: bool,
    extra_info: bool,
    players: bool,
    rules: bool,
    ping: bool,
) -> Result<String> {
    let now = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map_err(|e| LauncherError::Other(format!("System time error: {}", e)))?
        .as_millis() as u64;

    let key = format!("{}:{}", ip, port);

    let should_allow = {
        let mut map = match QUERY_RATE_LIMIT_LIST.lock() {
            Ok(guard) => guard,
            Err(poisoned) => poisoned.into_inner(),
        };
        match map.get(&key) {
            Some(&last_time) if now - last_time < QUERY_RATE_LIMIT_MS => false,
            _ => {
                map.insert(key.clone(), now);
                true
            }
        }
    };

    if !should_allow {
        let error_details = ErrorResponse {
            error: true,
            info: "Rate limit exceeded. Please wait before querying this server again.".to_string(),
        };
        return Ok(serde_json::to_string(&error_details)
            .unwrap_or_else(|_| r#"{"error":true,"info":"Rate limit exceeded"}""#.to_string()));
    }

    let q = {
        let mut cache = CACHED_QUERY.lock().await;

        let should_reuse = match cache.as_ref() {
            Some((_, cached_key)) => cached_key == key,
            None => false,
        };

        if should_reuse {
            let (cached_query, _, _) = cache.take().unwrap();
            cached_query
        } else {
            Query::new(ip, port).await?
        }
    };

    let result = {
        let mut result = ServerQueryResponse {
            info: None,
            extra_info: None,
            players: None,
            rules: None,
            ping: None,
        };

        if info {
            let _ = q.send('i').await;
            result.info = Some(match q.recv().await {
                Ok(p) => format!("{}", p),
                Err(e) => {
                    let mut error_details = ErrorResponse::default();
                    error_details.error = true;
                    error_details.info = e.to_string();
                    serde_json::to_string(&error_details).unwrap_or_else(|_| {
                        r#"{"error":true,"info":"Serialization failed"}"#.to_string()
                    })
                }
            });
        }

        if players {
            let _ = q.send('c').await;
            result.players = Some(match q.recv().await {
                Ok(p) => format!("{}", p),
                Err(e) => {
                    let mut error_details = ErrorResponse::default();
                    error_details.error = true;
                    error_details.info = e.to_string();
                    serde_json::to_string(&error_details).unwrap_or_else(|_| {
                        r#"{"error":true,"info":"Serialization failed"}"#.to_string()
                    })
                }
            });
        }

        if rules {
            let _ = q.send('r').await;
            result.rules = Some(match q.recv().await {
                Ok(p) => format!("{}", p),
                Err(e) => {
                    let mut error_details = ErrorResponse::default();
                    error_details.error = true;
                    error_details.info = e.to_string();
                    serde_json::to_string(&error_details).unwrap_or_else(|_| {
                        r#"{"error":true,"info":"Serialization failed"}"#.to_string()
                    })
                }
            });
        }

        if extra_info {
            let now_secs = SystemTime::now()
                .duration_since(UNIX_EPOCH)
                .map_err(|e| LauncherError::Other(format!("System time error: {}", e)))?
                .as_secs();

            let key = format!("{}:{}", ip, port);

            let should_request = {
                let mut map = match OMP_EXTRA_INFO_LAST_UPDATE_LIST.lock() {
                    Ok(guard) => guard,
                    Err(poisoned) => {
                        // Recover from poisoned mutex by getting the data anyway
                        poisoned.into_inner()
                    }
                };

                match map.get(&key) {
                    Some(&last_time)
                        if now_secs - last_time < OMP_EXTRA_INFO_UPDATE_COOLDOWN_SECS =>
                    {
                        false
                    }
                    _ => {
                        map.insert(key.clone(), now_secs);
                        true
                    }
                }
            };

            if should_request {
                let _ = q.send('o').await;
                result.extra_info = Some(match q.recv().await {
                    Ok(p) => format!("{}", p),
                    Err(e) => {
                        let mut error_details = ErrorResponse::default();
                        error_details.error = true;
                        error_details.info = e.to_string();
                        serde_json::to_string(&error_details).unwrap_or_else(|_| {
                            r#"{"error":true,"info":"Serialization failed"}"#.to_string()
                        })
                    }
                });
            }
        }

        if ping {
            let _ = q.send('p').await;
            let before = Instant::now();
            match q.recv().await {
                Ok(_p) => {
                    result.ping = Some(before.elapsed().as_millis() as u32);
                }
                Err(_) => {
                    result.ping = Some(PING_TIMEOUT);
                }
            }
        }
    };

    // Store the query back in cache for next use
    {
        let mut cache = CACHED_QUERY.lock().await;
        *cache = Some((q, key));
    }

    serde_json::to_string(&result).map_err(|e| LauncherError::SerdeJson(e))
}
