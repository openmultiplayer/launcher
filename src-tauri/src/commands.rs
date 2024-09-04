use std::process::Command;

use crate::{injector, samp};
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
) -> Result<(), String> {
    injector::run_samp(name, ip, port, exe, dll, omp_file, password).await
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

            // Run a delayed command to relaunch the app as admin
            runas::Command::new("cmd")
                .args(&["/C", "cmd", "/C", &format!("timeout /T 3  \"{}\"", path)])
                .status()
                .expect("Failed to execute command");

            // Terminate the current process
            // std::process::exit(0);

            Ok("SUCCESS".to_string())
        }
        Err(e) => {
            info!("{}", e.to_string());
            Err("FAILED".to_string())
        }
    }
}

#[tauri::command]
pub fn get_samp_favorite_list() -> String {
    samp::get_samp_favorite_list()
}
