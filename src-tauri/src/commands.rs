use crate::{constants::SAMP6_PACKET_HEADER, errors::LauncherError, helpers, injector, samp};
use log::{error, info, warn};
use md5::compute;
use sevenz_rust::decompress_file;
use std::fs::File;
use std::io::Read;
use std::net::{IpAddr, SocketAddr};
use std::time::Duration;
use tokio::net::{lookup_host, UdpSocket};
use tokio::time::timeout;

#[tauri::command]
pub async fn inject(
    name: &str,
    ip: &str,
    port: i32,
    exe: &str,
    dll: &str,
    trace_file: &str,
    trace_dualstack: Option<bool>,
    omp_file: &str,
    password: &str,
    custom_game_exe: &str,
) -> std::result::Result<(), String> {
    let actual_omp_file = if *crate::NO_OMP_FLAG.lock().unwrap() {
        ""
    } else {
        omp_file
    };

    match injector::run_samp(
        name,
        ip,
        port,
        exe,
        dll,
        trace_file,
        trace_dualstack.unwrap_or(false),
        actual_omp_file,
        password,
        custom_game_exe,
    )
    .await
    {
        Ok(_) => Ok(()),
        Err(e) => {
            log::warn!("{}", e);
            match e {
                LauncherError::AccessDenied(_) => {
                    return Err("need_admin".to_string());
                }
                _ => return Err(e.to_string()),
            }
        }
    }
}

#[tauri::command]
pub fn get_gtasa_path_from_samp() -> String {
    samp::get_gtasa_path()
}

#[tauri::command]
pub fn get_nickname_from_samp() -> String {
    samp::get_nickname()
}

#[tauri::command]
pub fn rerun_as_admin() -> std::result::Result<String, String> {
    let exe_path = std::env::current_exe()
        .map_err(|_| "Failed to get current executable path".to_string())?
        .into_os_string()
        .into_string()
        .map_err(|_| "Failed to convert path to string".to_string())?;

    runas::Command::new(exe_path)
        .arg("")
        .status()
        .map_err(|_| "Failed to restart as administrator".to_string())?;

    Ok("SUCCESS".to_string())
}

#[tauri::command]
pub fn get_samp_favorite_list() -> String {
    samp::get_samp_favorite_list()
}

#[tauri::command]
pub fn resolve_hostname(
    hostname: String,
    family: Option<String>,
) -> std::result::Result<String, String> {
    use std::net::ToSocketAddrs;

    if hostname.is_empty() {
        return Err("Hostname cannot be empty".to_string());
    }

    let desired_family = match family.as_deref() {
        Some("ipv4") => Some(false),
        Some("ipv6") => Some(true),
        Some(other) => {
            return Err(format!(
                "Invalid family '{}', expected 'ipv4' or 'ipv6'",
                other
            ))
        }
        None => None,
    };

    let normalized = hostname
        .trim()
        .trim_start_matches('[')
        .trim_end_matches(']');
    if let Ok(ip) = normalized.parse::<IpAddr>() {
        if let Some(want_ipv6) = desired_family {
            if ip.is_ipv6() != want_ipv6 {
                return Err(format!(
                    "Hostname '{}' does not match requested family '{}'",
                    hostname,
                    if want_ipv6 { "ipv6" } else { "ipv4" }
                ));
            }
        }
        return Ok(ip.to_string());
    }

    let addr = format!("{}:80", normalized);
    let addrs = addr
        .to_socket_addrs()
        .map_err(|e| format!("Failed to resolve hostname '{}': {}", normalized, e))?;

    for socket_addr in addrs {
        if desired_family.map_or(true, |want_ipv6| socket_addr.is_ipv6() == want_ipv6) {
            return Ok(socket_addr.ip().to_string());
        }
    }

    match desired_family {
        Some(true) => Err(format!(
            "No IPv6 address found for hostname '{}'",
            normalized
        )),
        Some(false) => Err(format!(
            "No IPv4 address found for hostname '{}'",
            normalized
        )),
        None => Err(format!("No address found for hostname '{}'", normalized)),
    }
}

#[tauri::command]
pub async fn probe_ipv6_query(host: String, port: i32) -> std::result::Result<bool, String> {
    if port < 1 || port > 65535 {
        return Err(format!("Invalid port '{}'", port));
    }

    let normalized = host.trim().trim_start_matches('[').trim_end_matches(']');
    let target = if let Ok(ip) = normalized.parse::<IpAddr>() {
        if !ip.is_ipv6() {
            return Ok(false);
        }
        SocketAddr::new(ip, port as u16)
    } else {
        let mut addrs = lookup_host(format!("{}:{}", normalized, port))
            .await
            .map_err(|e| format!("Failed to resolve hostname '{}': {}", normalized, e))?;

        if let Some(addr) = addrs.find(|addr| addr.is_ipv6()) {
            addr
        } else {
            return Ok(false);
        }
    };

    let socket = match UdpSocket::bind("[::]:0").await {
        Ok(socket) => socket,
        Err(_) => return Ok(false),
    };

    if socket.connect(target).await.is_err() {
        return Ok(false);
    }

    let mut packet: Vec<u8> = Vec::with_capacity(24);
    if let IpAddr::V6(address) = target.ip() {
        packet.extend_from_slice(SAMP6_PACKET_HEADER);
        packet.extend_from_slice(&address.octets());
    } else {
        return Ok(false);
    }

    packet.push((target.port() & 0xFF) as u8);
    packet.push((target.port() >> 8 & 0xFF) as u8);
    packet.push(b'i');

    if socket.send(&packet).await.is_err() {
        return Ok(false);
    }

    let mut buf = [0u8; 2048];
    let received = match timeout(Duration::from_millis(1500), socket.recv(&mut buf)).await {
        Ok(Ok(n)) => n,
        _ => return Ok(false),
    };

    Ok(received >= 24 && &buf[..5] == SAMP6_PACKET_HEADER)
}

#[tauri::command]
pub fn is_process_alive(pid: u32) -> bool {
    use windows_sys::Win32::Foundation::{CloseHandle, HANDLE};
    use windows_sys::Win32::System::Threading::{OpenProcess, PROCESS_QUERY_LIMITED_INFORMATION};

    unsafe {
        let handle: HANDLE = OpenProcess(PROCESS_QUERY_LIMITED_INFORMATION, 0, pid);
        if handle != 0 {
            CloseHandle(handle);
            true
        } else {
            false
        }
    }
}

#[tauri::command]
pub fn get_checksum_of_files(list: Vec<String>) -> std::result::Result<Vec<String>, String> {
    let mut result = Vec::new();

    for file in list {
        let mut f =
            File::open(&file).map_err(|e| format!("Failed to open file '{}': {}", file, e))?;

        let mut contents = Vec::new();
        f.read_to_end(&mut contents)
            .map_err(|e| format!("Failed to read file '{}': {}", file, e))?;

        let digest = compute(&contents);
        let checksum_entry = format!("{}|{:x}", file, digest);
        result.push(checksum_entry);
    }

    Ok(result)
}

#[tauri::command]
pub fn extract_7z(path: String, output_path: String) -> std::result::Result<(), String> {
    decompress_file(&path, &output_path)
        .map_err(|e| format!("Failed to extract archive '{}': {}", path, e))
}

#[tauri::command]
pub fn copy_files_to_gtasa(src: String, gtasa_dir: String) -> std::result::Result<(), String> {
    match helpers::copy_files(&src, &gtasa_dir) {
        Ok(_) => Ok(()),
        Err(e) => {
            log::warn!("{}", e);
            match e {
                LauncherError::AccessDenied(_) => {
                    return Err("need_admin".to_string());
                }
                _ => return Err(e.to_string()),
            }
        }
    }
}

#[tauri::command]
pub fn log_info(msg: &str) -> () {
    info!("Frontend info: {}", msg);
}

#[tauri::command]
pub fn log_warn(msg: &str) -> () {
    warn!("Frontend warning: {}", msg);
}

#[tauri::command]
pub fn log_error(msg: &str) -> () {
    error!("Frontend error: {}", msg);
}
