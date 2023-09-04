use byteorder::{LittleEndian, ReadBytesExt};
use chardet::{charset2encoding, detect};
use encoding::label::encoding_from_whatwg_label;
use encoding::DecoderTrap;
use serde::{Deserialize, Serialize};
use std::io::{Cursor, Read};
use std::{net::Ipv4Addr, time::Duration};
use tokio::net::UdpSocket;
use tokio::time::timeout_at;
use tokio::time::Instant;

pub struct Query {
    address: Ipv4Addr,
    port: i32,
    socket: UdpSocket,
}

#[derive(Serialize, Deserialize)]
pub struct InfoPacket {
    pub password: bool,
    pub players: u16,
    pub max_players: u16,
    pub hostname: String,
    pub gamemode: String,
    pub language: String,
}

impl Default for InfoPacket {
    fn default() -> Self {
        Self {
            password: false,
            players: 0,
            max_players: 0,
            hostname: String::new(),
            gamemode: String::new(),
            language: String::new(),
        }
    }
}

#[derive(Serialize, Deserialize, Clone)]
pub struct Player {
    pub name: String,
    pub score: u16,
}

impl Default for Player {
    fn default() -> Self {
        Self {
            name: String::new(),
            score: 0,
        }
    }
}

fn decode_buffer(buf: Vec<u8>) -> String {
    let result = detect(&buf);
    let coder = encoding_from_whatwg_label(charset2encoding(&result.0));
    if coder.is_some() {
        coder
            .unwrap()
            .decode(&buf, DecoderTrap::Ignore)
            .expect("Error")
    } else {
        String::from_utf8_lossy(buf.as_slice()).to_string()
    }
}

impl Query {
    pub async fn new(addr: &str, port: i32) -> Result<Self, std::io::Error> {
        let data = Self {
            address: addr.parse::<Ipv4Addr>().unwrap(),
            port,
            socket: UdpSocket::bind("0.0.0.0:0").await.unwrap(),
        };
        data.socket
            .connect(format!("{}:{}", addr, port))
            .await
            .unwrap();
        Ok(data)
    }

    pub async fn send(&self, query_type: char) -> Result<usize, std::io::Error> {
        let mut packet: Vec<u8> = Vec::new();
        packet.append(&mut "SAMP".to_owned().into_bytes());
        for i in 0..4 {
            packet.push(self.address.octets()[i]);
        }
        packet.push((self.port & 0xFF) as u8);
        packet.push((self.port >> 8 & 0xFF) as u8);
        packet.push(query_type as u8);

        if query_type == 'p' || query_type == 'o' {
            packet.push(0);
            packet.push(0);
            packet.push(0);
            packet.push(0);
        }

        let amt = self.socket.send(&packet).await.unwrap();
        Ok(amt)
    }

    pub async fn recv(&self) -> Result<String, std::io::Error> {
        let mut buf = [0; 1500];
        let amt;
        match timeout_at(
            Instant::now() + Duration::from_secs(2),
            self.socket.recv(&mut buf),
        )
        .await?
        {
            Ok(n) => amt = n,
            Err(e) => return Err(e),
        }
        let query_type = buf[10] as char;
        let packet = Cursor::new(buf[11..amt].to_vec());
        if query_type == 'i' {
            self.build_info_packet(packet)
        } else if query_type == 'c' {
            self.build_players_packet(packet)
        } else if query_type == 'r' {
            self.build_rules_packet(packet)
        } else if query_type == 'o' {
            Ok(String::from("{\"isOmp\": true}"))
        } else if query_type == 'p' {
            Ok(String::from("pong"))
        } else {
            Ok(String::from("no_data"))
        }
    }

    fn build_info_packet(&self, mut packet: Cursor<Vec<u8>>) -> Result<String, std::io::Error> {
        let mut data = InfoPacket::default();

        data.password = packet.read_i8().unwrap() != 0;
        data.players = packet.read_u16::<LittleEndian>().unwrap();
        data.max_players = packet.read_u16::<LittleEndian>().unwrap();

        let hostname_len = packet.read_u32::<LittleEndian>().unwrap();
        let mut hostname_buf = vec![0u8; hostname_len as usize];
        packet.read_exact(&mut hostname_buf).unwrap();
        data.hostname = decode_buffer(hostname_buf);

        let gamemode_len = packet.read_u32::<LittleEndian>().unwrap();
        let mut gamemode_buf = vec![0u8; gamemode_len as usize];
        packet.read_exact(&mut gamemode_buf).unwrap();
        data.gamemode = decode_buffer(gamemode_buf);

        let language_len = packet.read_u32::<LittleEndian>().unwrap();
        let mut language_buf = vec![0u8; language_len as usize];
        packet.read_exact(&mut language_buf).unwrap();
        data.language = decode_buffer(language_buf);

        Ok(serde_json::to_string(&data).unwrap())
    }

    fn build_players_packet(&self, mut packet: Cursor<Vec<u8>>) -> Result<String, std::io::Error> {
        let player_count = packet.read_u16::<LittleEndian>().unwrap();
        let default_player = Player::default();
        let mut players = vec![default_player; player_count as usize];

        for i in 0..player_count {
            let player = &mut players[i as usize];

            let player_name_len = packet.read_u8().unwrap();
            let mut player_name_buf = vec![0u8; player_name_len as usize];
            packet.read_exact(&mut player_name_buf).unwrap();
            player.name = String::from_utf8(player_name_buf).unwrap();

            player.score = packet.read_u16::<LittleEndian>().unwrap();
            let _ = packet.read_u16::<LittleEndian>();
        }

        Ok(serde_json::to_string(&players).unwrap())
    }

    fn build_rules_packet(&self, mut packet: Cursor<Vec<u8>>) -> Result<String, std::io::Error> {
        let rule_count = packet.read_u16::<LittleEndian>().unwrap();
        let mut rules: Vec<Vec<String>> = Vec::new();

        for _ in 0..rule_count {
            let mut rule: Vec<String> = Vec::new();

            let rule_name_len = packet.read_u8().unwrap();
            let mut rule_name_buf = vec![0u8; rule_name_len as usize];
            packet.read_exact(&mut rule_name_buf).unwrap();
            rule.push(decode_buffer(rule_name_buf));

            let rule_value_len = packet.read_u8().unwrap();
            let mut rule_value_buf = vec![0u8; rule_value_len as usize];
            packet.read_exact(&mut rule_value_buf).unwrap();
            rule.push(decode_buffer(rule_value_buf));

            rules.push(rule);
        }

        Ok(serde_json::to_string(&rules).unwrap())
    }
}
