use crate::{errors::LauncherError, injector, samp};
use log::info;

#[tauri::command]
pub async fn inject(
    name: &str,
    ip: &str,
    port: i32,
    exe: &str,
    dll: &str,
    omp_file: &str,
    password: &str,
    discord: bool,
) -> std::result::Result<(), String> {
    match injector::run_samp(name, ip, port, exe, dll, omp_file, password, discord).await {
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
pub fn resolve_hostname(hostname: String) -> std::result::Result<String, String> {
    use std::net::{IpAddr, ToSocketAddrs};

    if hostname.is_empty() {
        return Err("Hostname cannot be empty".to_string());
    }

    let addr = format!("{}:80", hostname);
    let addrs = addr
        .to_socket_addrs()
        .map_err(|e| format!("Failed to resolve hostname '{}': {}", hostname, e))?;

    for ip in addrs {
        if let IpAddr::V4(ipv4) = ip.ip() {
            return Ok(ipv4.to_string());
        }
    }

    Err(format!("No IPv4 address found for hostname '{}'", hostname))
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
pub fn log(msg: &str) -> () {
    info!("Frontend log: {}", msg);
}
