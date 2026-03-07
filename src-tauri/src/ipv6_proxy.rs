use crate::{
    constants::{SAMP6_PACKET_HEADER, SAMP_PACKET_HEADER, UDP_BUFFER_SIZE},
    errors::{LauncherError, Result},
};
use log::{info, warn};
use once_cell::sync::Lazy;
use serde::Serialize;
use std::fmt::Write as _;
use std::net::{IpAddr, Ipv4Addr, SocketAddr};
use tokio::net::{lookup_host, UdpSocket};
use tokio::sync::{oneshot, Mutex};
use tokio::task::JoinHandle;
use tokio::time::{sleep, timeout, Duration};

#[derive(Serialize)]
pub struct ProxyInfo {
    pub host: String,
    pub port: u16,
}

struct RunningProxy {
    stop: oneshot::Sender<()>,
    task: JoinHandle<()>,
}

static RUNNING_PROXY: Lazy<Mutex<Option<RunningProxy>>> = Lazy::new(|| Mutex::new(None));
const LOCAL_BIND_RETRY_COUNT: usize = 10;
const LOCAL_BIND_RETRY_DELAY_MS: u64 = 50;
const PROXY_STOP_WAIT_MS: u64 = 1000;
const PACKET_PREVIEW_BYTES: usize = 12;
const LEGACY_OPEN_CONNECTION_REQUEST_NEW: u8 = 24;
const LEGACY_OPEN_CONNECTION_REQUEST_OLD: u8 = 10;

const SAMP_LEGACY_DECRYPT_KEY: [u8; 256] = [
    0xB4, 0x62, 0x07, 0xE5, 0x9D, 0xAF, 0x63, 0xDD, 0xE3, 0xD0, 0xCC, 0xFE, 0xDC, 0xDB, 0x6B,
    0x2E, 0x6A, 0x40, 0xAB, 0x47, 0xC9, 0xD1, 0x53, 0xD5, 0x20, 0x91, 0xA5, 0x0E, 0x4A, 0xDF,
    0x18, 0x89, 0xFD, 0x6F, 0x25, 0x12, 0xB7, 0x13, 0x77, 0x00, 0x65, 0x36, 0x6D, 0x49, 0xEC,
    0x57, 0x2A, 0xA9, 0x11, 0x5F, 0xFA, 0x78, 0x95, 0xA4, 0xBD, 0x1E, 0xD9, 0x79, 0x44, 0xCD,
    0xDE, 0x81, 0xEB, 0x09, 0x3E, 0xF6, 0xEE, 0xDA, 0x7F, 0xA3, 0x1A, 0xA7, 0x2D, 0xA6, 0xAD,
    0xC1, 0x46, 0x93, 0xD2, 0x1B, 0x9C, 0xAA, 0xD7, 0x4E, 0x4B, 0x4D, 0x4C, 0xF3, 0xB8, 0x34,
    0xC0, 0xCA, 0x88, 0xF4, 0x94, 0xCB, 0x04, 0x39, 0x30, 0x82, 0xD6, 0x73, 0xB0, 0xBF, 0x22,
    0x01, 0x41, 0x6E, 0x48, 0x2C, 0xA8, 0x75, 0xB1, 0x0A, 0xAE, 0x9F, 0x27, 0x80, 0x10, 0xCE,
    0xF0, 0x29, 0x28, 0x85, 0x0D, 0x05, 0xF7, 0x35, 0xBB, 0xBC, 0x15, 0x06, 0xF5, 0x60, 0x71,
    0x03, 0x1F, 0xEA, 0x5A, 0x33, 0x92, 0x8D, 0xE7, 0x90, 0x5B, 0xE9, 0xCF, 0x9E, 0xD3, 0x5D,
    0xED, 0x31, 0x1C, 0x0B, 0x52, 0x16, 0x51, 0x0F, 0x86, 0xC5, 0x68, 0x9B, 0x21, 0x0C, 0x8B,
    0x42, 0x87, 0xFF, 0x4F, 0xBE, 0xC8, 0xE8, 0xC7, 0xD4, 0x7A, 0xE0, 0x55, 0x2F, 0x8A, 0x8E,
    0xBA, 0x98, 0x37, 0xE4, 0xB2, 0x38, 0xA1, 0xB6, 0x32, 0x83, 0x3A, 0x7B, 0x84, 0x3C, 0x61,
    0xFB, 0x8C, 0x14, 0x3D, 0x43, 0x3B, 0x1D, 0xC3, 0xA2, 0x96, 0xB3, 0xF8, 0xC4, 0xF2, 0x26,
    0x2B, 0xD8, 0x7C, 0xFC, 0x23, 0x24, 0x66, 0xEF, 0x69, 0x64, 0x50, 0x54, 0x59, 0xF1, 0xA0,
    0x74, 0xAC, 0xC6, 0x7D, 0xB5, 0xE6, 0xE2, 0xC2, 0x7E, 0x67, 0x17, 0x5E, 0xE1, 0xB9, 0x3F,
    0x6C, 0x70, 0x08, 0x99, 0x45, 0x56, 0x76, 0xF9, 0x9A, 0x97, 0x19, 0x72, 0x5C, 0x02, 0x8F,
    0x58,
];

static SAMP_LEGACY_ENCRYPT_KEY: Lazy<[u8; 256]> = Lazy::new(|| {
    let mut inverse = [0u8; 256];
    for (index, value) in SAMP_LEGACY_DECRYPT_KEY.iter().enumerate() {
        inverse[*value as usize] = index as u8;
    }
    inverse
});

async fn stop_running_proxy_task() {
    let previous = {
        let mut running_proxy = RUNNING_PROXY.lock().await;
        running_proxy.take()
    };

    if let Some(existing) = previous {
        info!("[ipv6-proxy] stopping previous proxy task");
        let _ = existing.stop.send(());

        match timeout(Duration::from_millis(PROXY_STOP_WAIT_MS), existing.task).await {
            Ok(Ok(())) => {}
            Ok(Err(error)) => {
                warn!("[ipv6-proxy] previous proxy task join failed: {}", error);
            }
            Err(_) => {
                warn!("[ipv6-proxy] previous proxy task did not stop in time; aborting");
            }
        }
    }
}

async fn resolve_ipv6_target(host: &str, port: u16) -> Result<SocketAddr> {
    let normalized = host.trim().trim_start_matches('[').trim_end_matches(']');

    if let Ok(ip) = normalized.parse::<IpAddr>() {
        return match ip {
            IpAddr::V6(_) => Ok(SocketAddr::new(ip, port)),
            IpAddr::V4(_) => Err(LauncherError::InvalidInput(format!(
                "Expected an IPv6 target, got IPv4 '{}'",
                normalized
            ))),
        };
    }

    let mut addrs = lookup_host(format!("{}:{}", normalized, port))
        .await
        .map_err(|e| {
            LauncherError::Network(format!("Failed to resolve '{}': {}", normalized, e))
        })?;

    addrs.find(|addr| addr.is_ipv6()).ok_or_else(|| {
        LauncherError::NotFound(format!("No IPv6 address found for '{}'", normalized))
    })
}

fn rewrite_client_packet_for_ipv6(packet: &[u8], remote: SocketAddr) -> Vec<u8> {
    if packet.len() >= 11 && &packet[..4] == SAMP_PACKET_HEADER {
        if let IpAddr::V6(address) = remote.ip() {
            let mut rewritten = Vec::with_capacity(packet.len() + 13);
            rewritten.extend_from_slice(SAMP6_PACKET_HEADER);
            rewritten.extend_from_slice(&address.octets());
            rewritten.push((remote.port() & 0xFF) as u8);
            rewritten.push(((remote.port() >> 8) & 0xFF) as u8);
            rewritten.extend_from_slice(&packet[10..]);
            return rewritten;
        }
    }

    packet.to_vec()
}

fn rewrite_server_packet_for_ipv4(packet: &[u8], local_port: u16) -> Vec<u8> {
    if packet.len() >= 24 && &packet[..5] == SAMP6_PACKET_HEADER {
        let mut rewritten = Vec::with_capacity(packet.len() - 13);
        rewritten.extend_from_slice(SAMP_PACKET_HEADER);
        rewritten.extend_from_slice(&Ipv4Addr::LOCALHOST.octets());
        rewritten.push((local_port & 0xFF) as u8);
        rewritten.push(((local_port >> 8) & 0xFF) as u8);
        rewritten.extend_from_slice(&packet[23..]);
        return rewritten;
    }

    packet.to_vec()
}

fn decrypt_legacy_samp_packet(packet: &[u8], port: u16) -> Option<Vec<u8>> {
    if packet.len() < 2 {
        return None;
    }

    let mut decrypted = Vec::with_capacity(packet.len().saturating_sub(1));
    let mut checksum = 0u8;
    let port_mask = (port as u8) ^ 0xCC;

    for (index, byte) in packet.iter().enumerate().skip(1) {
        let mut value = *byte;
        if index % 2 == 0 {
            value ^= port_mask;
        }

        let plain = SAMP_LEGACY_DECRYPT_KEY[value as usize];
        checksum ^= plain & 0xAA;
        decrypted.push(plain);
    }

    if packet[0] != checksum {
        return None;
    }

    Some(decrypted)
}

fn encrypt_legacy_samp_packet(payload: &[u8], port: u16) -> Vec<u8> {
    let mut encrypted = Vec::with_capacity(payload.len() + 1);
    let mut checksum = 0u8;
    let port_mask = (port as u8) ^ 0xCC;

    encrypted.push(0);
    for (index, byte) in payload.iter().enumerate() {
        checksum ^= *byte & 0xAA;

        let mut value = SAMP_LEGACY_ENCRYPT_KEY[*byte as usize];
        if (index + 1) % 2 == 0 {
            value ^= port_mask;
        }

        encrypted.push(value);
    }

    encrypted[0] = checksum;
    encrypted
}

fn is_legacy_open_connection_request(packet_id: u8) -> bool {
    packet_id == LEGACY_OPEN_CONNECTION_REQUEST_NEW || packet_id == LEGACY_OPEN_CONNECTION_REQUEST_OLD
}

fn is_likely_legacy_server_control(packet_id: u8) -> bool {
    matches!(
        packet_id,
        11 | 12 | 17 | 19
            | 25
            | 26
            | 29
            | 30
            | 31
            | 32
    )
}

fn rewrite_client_packet(
    packet: &[u8],
    remote: SocketAddr,
    local_port: u16,
    legacy_client_cipher_active: &mut bool,
) -> Vec<u8> {
    if packet.len() >= 11 && &packet[..4] == SAMP_PACKET_HEADER {
        return rewrite_client_packet_for_ipv6(packet, remote);
    }

    let Some(decrypted) = decrypt_legacy_samp_packet(packet, local_port) else {
        return packet.to_vec();
    };

    let packet_id = decrypted[0];
    if !*legacy_client_cipher_active {
        if !is_legacy_open_connection_request(packet_id) {
            return packet.to_vec();
        }

        *legacy_client_cipher_active = true;
        info!(
            "[ipv6-proxy] enabled legacy client cipher translation (id={}, local_port={}, remote_port={})",
            packet_id,
            local_port,
            remote.port()
        );
    }

    encrypt_legacy_samp_packet(&decrypted, remote.port())
}

fn rewrite_server_packet(
    packet: &[u8],
    local_port: u16,
    remote_port: u16,
    legacy_remote_cipher_active: &mut bool,
) -> Vec<u8> {
    if packet.len() >= 24 && &packet[..5] == SAMP6_PACKET_HEADER {
        return rewrite_server_packet_for_ipv4(packet, local_port);
    }

    let Some(decrypted) = decrypt_legacy_samp_packet(packet, remote_port) else {
        return packet.to_vec();
    };

    let packet_id = decrypted[0];
    if !*legacy_remote_cipher_active {
        if !is_likely_legacy_server_control(packet_id) {
            return packet.to_vec();
        }

        *legacy_remote_cipher_active = true;
        info!(
            "[ipv6-proxy] enabled legacy remote cipher translation (id={}, remote_port={}, local_port={})",
            packet_id, remote_port, local_port
        );
    }

    encrypt_legacy_samp_packet(&decrypted, local_port)
}

fn detect_preferred_local_ipv4() -> Option<Ipv4Addr> {
    let socket = std::net::UdpSocket::bind((Ipv4Addr::UNSPECIFIED, 0)).ok()?;
    socket.connect((Ipv4Addr::new(1, 1, 1, 1), 53)).ok()?;
    match socket.local_addr().ok()?.ip() {
        IpAddr::V4(addr) if !addr.is_loopback() && !addr.is_unspecified() => Some(addr),
        _ => None,
    }
}

fn packet_prefix(packet: &[u8]) -> String {
    let shown = std::cmp::min(packet.len(), PACKET_PREVIEW_BYTES);
    let mut output = String::with_capacity(shown * 2 + 3);

    for byte in &packet[..shown] {
        let _ = write!(output, "{:02x}", byte);
    }

    if packet.len() > shown {
        output.push_str("...");
    }

    output
}

async fn bind_local_proxy_socket(
    bind_ip: Ipv4Addr,
    port: u16,
) -> std::result::Result<UdpSocket, String> {
    let bind_addr = (bind_ip, port);

    for attempt in 1..=LOCAL_BIND_RETRY_COUNT {
        match UdpSocket::bind(bind_addr).await {
            Ok(socket) => return Ok(socket),
            Err(error) if attempt < LOCAL_BIND_RETRY_COUNT => {
                warn!(
                    "[ipv6-proxy] bind retry {}/{} for {}:{} failed: {}",
                    attempt, LOCAL_BIND_RETRY_COUNT, bind_ip, port, error
                );
                sleep(Duration::from_millis(LOCAL_BIND_RETRY_DELAY_MS)).await;
            }
            Err(error) => {
                return Err(format!(
                    "Failed to bind local IPv4 proxy socket on {}:{} after {} attempts: {}",
                    bind_ip, port, LOCAL_BIND_RETRY_COUNT, error
                ));
            }
        }
    }

    Err(format!(
        "Failed to bind local IPv4 proxy socket on {}:{}",
        bind_ip, port
    ))
}

#[tauri::command]
pub async fn start_ipv6_proxy(
    host: String,
    port: i32,
    local_port: Option<i32>,
) -> std::result::Result<ProxyInfo, String> {
    if !(1..=65535).contains(&port) {
        return Err(format!("Invalid port '{}'", port));
    }

    let requested_local_port = local_port.unwrap_or(0);
    if !(0..=65535).contains(&requested_local_port) {
        return Err(format!("Invalid local port '{}'", requested_local_port));
    }

    info!(
        "[ipv6-proxy] start request host={} port={} local_port={}",
        host, port, requested_local_port
    );

    let target = resolve_ipv6_target(&host, port as u16)
        .await
        .map_err(|error| {
            let text = String::from(error);
            warn!("[ipv6-proxy] target resolution failed: {}", text);
            text
        })?;

    stop_running_proxy_task().await;

    let local_bind_port = requested_local_port as u16;
    let preferred_bind_ip = detect_preferred_local_ipv4().unwrap_or(Ipv4Addr::LOCALHOST);

    let local_socket = match bind_local_proxy_socket(preferred_bind_ip, local_bind_port).await {
        Ok(socket) => socket,
        Err(error) if preferred_bind_ip != Ipv4Addr::LOCALHOST => {
            warn!(
                "[ipv6-proxy] {}. Falling back to 127.0.0.1:{}",
                error, local_bind_port
            );
            bind_local_proxy_socket(Ipv4Addr::LOCALHOST, local_bind_port)
                .await
                .map_err(|fallback_error| {
                    warn!("[ipv6-proxy] {}", fallback_error);
                    fallback_error
                })?
        }
        Err(error) => {
            warn!("[ipv6-proxy] {}", error);
            return Err(error);
        }
    };
    let local_addr = local_socket
        .local_addr()
        .map_err(|e| format!("Failed to read local proxy address: {}", e))?;
    let local_port = local_addr.port();
    let local_host = match local_addr.ip() {
        IpAddr::V4(ip) => ip,
        _ => Ipv4Addr::LOCALHOST,
    };

    let remote_socket = UdpSocket::bind("[::]:0").await.map_err(|e| {
        let text = format!("Failed to bind local IPv6 proxy socket: {}", e);
        warn!("[ipv6-proxy] {}", text);
        text
    })?;
    remote_socket.connect(target).await.map_err(|e| {
        let text = format!("Failed to connect IPv6 proxy socket to {}: {}", target, e);
        warn!("[ipv6-proxy] {}", text);
        text
    })?;

    info!(
        "[ipv6-proxy] started local {} -> remote {}",
        local_addr, target
    );

    let (stop_tx, mut stop_rx) = oneshot::channel::<()>();
    let task = tokio::spawn(async move {
        let mut client_addr: Option<SocketAddr> = None;
        let mut local_buf = [0u8; UDP_BUFFER_SIZE];
        let mut remote_buf = [0u8; UDP_BUFFER_SIZE];
        let mut client_packet_count = 0usize;
        let mut remote_packet_count = 0usize;
        let mut legacy_client_cipher_active = false;
        let mut legacy_remote_cipher_active = false;

        loop {
            tokio::select! {
                _ = &mut stop_rx => {
                    info!("[ipv6-proxy] stop requested for remote {}", target);
                    break;
                }
                recv = local_socket.recv_from(&mut local_buf) => {
                    match recv {
                        Ok((size, source)) => {
                            client_packet_count += 1;
                            if client_addr != Some(source) {
                                info!("[ipv6-proxy] client endpoint {}", source);
                                client_addr = Some(source);
                            }
                            if client_packet_count <= 3 || client_packet_count % 10 == 0 {
                                info!(
                                    "[ipv6-proxy] client->remote bytes={} prefix={}",
                                    size,
                                    packet_prefix(&local_buf[..size])
                                );
                            }

                            let outbound = rewrite_client_packet(
                                &local_buf[..size],
                                target,
                                local_port,
                                &mut legacy_client_cipher_active
                            );
                            if let Err(error) = remote_socket.send(&outbound).await {
                                warn!("[ipv6-proxy] failed to forward client packet to {}: {}", target, error);
                                break;
                            }
                        }
                        Err(error) => {
                            warn!("[ipv6-proxy] local recv_from failed: {}", error);
                            break;
                        }
                    }
                }
                recv = remote_socket.recv(&mut remote_buf) => {
                    match recv {
                        Ok(size) => {
                            remote_packet_count += 1;
                            let Some(client) = client_addr else {
                                continue;
                            };
                            if remote_packet_count <= 3 || remote_packet_count % 10 == 0 {
                                info!(
                                    "[ipv6-proxy] remote->client bytes={} prefix={}",
                                    size,
                                    packet_prefix(&remote_buf[..size])
                                );
                            }

                            let outbound = rewrite_server_packet(
                                &remote_buf[..size],
                                local_port,
                                target.port(),
                                &mut legacy_remote_cipher_active
                            );
                            if let Err(error) = local_socket.send_to(&outbound, client).await {
                                warn!("[ipv6-proxy] failed to forward server packet to {}: {}", client, error);
                                break;
                            }
                        }
                        Err(error) => {
                            warn!("[ipv6-proxy] remote recv failed: {}", error);
                            break;
                        }
                    }
                }
            }
        }

        info!(
            "[ipv6-proxy] relay task stopped for remote {} (client_packets={}, remote_packets={})",
            target, client_packet_count, remote_packet_count
        );
    });

    let mut running_proxy = RUNNING_PROXY.lock().await;
    *running_proxy = Some(RunningProxy {
        stop: stop_tx,
        task,
    });

    Ok(ProxyInfo {
        host: local_host.to_string(),
        port: local_port,
    })
}

#[tauri::command]
pub async fn stop_ipv6_proxy() -> std::result::Result<(), String> {
    stop_running_proxy_task().await;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::{
        decrypt_legacy_samp_packet, encrypt_legacy_samp_packet, LEGACY_OPEN_CONNECTION_REQUEST_NEW,
    };

    #[test]
    fn legacy_cipher_roundtrip_uses_port_mask() {
        let payload = [LEGACY_OPEN_CONNECTION_REQUEST_NEW, 0x12, 0x2A];
        let port = 55_599;

        let encrypted = encrypt_legacy_samp_packet(&payload, port);
        let decrypted = decrypt_legacy_samp_packet(&encrypted, port).expect("decryption should work");

        assert_eq!(decrypted, payload);
    }

    #[test]
    fn legacy_cipher_remap_preserves_plain_payload() {
        let payload = [LEGACY_OPEN_CONNECTION_REQUEST_NEW, 0x39, 0xDA];
        let local_port = 55_599;
        let remote_port = 7_777;

        let encrypted_for_local = encrypt_legacy_samp_packet(&payload, local_port);
        let decoded_for_local = decrypt_legacy_samp_packet(&encrypted_for_local, local_port)
            .expect("local decryption should work");
        let encrypted_for_remote = encrypt_legacy_samp_packet(&decoded_for_local, remote_port);
        let decoded_for_remote = decrypt_legacy_samp_packet(&encrypted_for_remote, remote_port)
            .expect("remote decryption should work");

        assert_eq!(decoded_for_remote, payload);
    }
}
