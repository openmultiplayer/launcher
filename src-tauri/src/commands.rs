use crate::{background_thread::check_for_new_instance_and_close, injector, samp};
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
) -> Result<(), String> {
    injector::run_samp(name, ip, port, exe, dll, omp_file, password, discord).await
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
pub fn rerun_as_admin() -> Result<String, String> {
    let res = std::env::current_exe();
    match res {
        Ok(p) => {
            let path = p.into_os_string().into_string().unwrap();
            runas::Command::new(path).arg("").status().unwrap();
            check_for_new_instance_and_close();
            Ok("SUCCESS".to_string())
        }
        Err(_) => Err("FAILED".to_string()),
    }
}

#[tauri::command]
pub fn get_samp_favorite_list() -> String {
    samp::get_samp_favorite_list()
}

#[tauri::command]
pub fn resolve_hostname(hostname: String) -> Result<String, String> {
    use std::net::{IpAddr, ToSocketAddrs};

    let addr = format!("{}:80", hostname);
    match addr.to_socket_addrs() {
        Ok(addrs) => {
            for ip in addrs {
                if let IpAddr::V4(ipv4) = ip.ip() {
                    return Ok(ipv4.to_string());
                }
            }
            Err("No IPv4 address found".to_string())
        }
        Err(e) => Err(format!("Failed to resolve: {}", e)),
    }
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
    info!("{}", msg);
    println!("{}", msg);
}

