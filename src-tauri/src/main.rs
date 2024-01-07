// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]
// use serde_json::json;
mod discord;
mod helpers;
mod injector;
mod query;
mod samp;

use log::LevelFilter;
use md5::compute;
use runas;
use sevenz_rust::decompress_file;
use std::fs::File;
use std::io::Read;
use std::time::Instant;
use tauri::Manager;
use tauri::PhysicalSize;

// Learn more about Tauri commands at https://tauri.app/v1/guides/features/command
#[tauri::command]
async fn request_server_info(ip: &str, port: i32) -> Result<String, String> {
    match query::Query::new(ip, port).await {
        Ok(q) => {
            let _ = q.send('i').await;
            match q.recv().await {
                Ok(p) => Ok(format!("{}", p)),
                Err(e) => Err(e.to_string()),
            }
        }
        Err(e) => Err(e.to_string()),
    }
}

#[tauri::command]
async fn request_server_players(ip: &str, port: i32) -> Result<String, String> {
    match query::Query::new(ip, port).await {
        Ok(q) => {
            let _ = q.send('c').await;
            match q.recv().await {
                Ok(p) => Ok(format!("{}", p)),
                Err(_) => Ok("{\"error\": true}".to_string()),
            }
        }
        Err(_) => Ok("{\"error\": true}".to_string()),
    }
}

#[tauri::command]
async fn request_server_rules(ip: &str, port: i32) -> Result<String, String> {
    match query::Query::new(ip, port).await {
        Ok(q) => {
            let _ = q.send('r').await;
            match q.recv().await {
                Ok(p) => Ok(format!("{}", p)),
                Err(e) => Err(e.to_string()),
            }
        }
        Err(e) => Err(e.to_string()),
    }
}

#[tauri::command]
async fn request_server_omp_extra_info(ip: &str, port: i32) -> Result<String, String> {
    match query::Query::new(ip, port).await {
        Ok(q) => {
            let _ = q.send('o').await;
            match q.recv().await {
                Ok(p) => Ok(format!("{}", p)),
                Err(e) => Err(e.to_string()),
            }
        }
        Err(e) => Err(e.to_string()),
    }
}

#[tauri::command]
async fn ping_server(ip: &str, port: i32) -> Result<u32, String> {
    match query::Query::new(ip, port).await {
        Ok(q) => {
            let _ = q.send('p').await;
            let before = Instant::now();
            match q.recv().await {
                Ok(_p) => Ok(before.elapsed().as_millis() as u32),
                Err(_) => Ok(9999),
            }
        }
        Err(_) => Ok(9999),
    }
}

#[tauri::command]
async fn inject(
    name: &str,
    ip: &str,
    port: i32,
    exe: &str,
    dll: &str,
    password: &str,
) -> Result<(), String> {
    injector::run_samp(name, ip, port, exe, dll, password).await
}

#[tauri::command]
fn get_gtasa_path_from_samp() -> String {
    samp::get_gtasa_path().to_string()
}

#[tauri::command]
fn get_nickname_from_samp() -> String {
    samp::get_nickname().to_string()
}

#[tauri::command]
fn rerun_as_admin() -> Result<String, String> {
    let res = std::env::current_exe();
    match res {
        Ok(p) => {
            let path = p.into_os_string().into_string().unwrap();
            runas::Command::new(path).arg("").status().unwrap();
            Ok("SUCCESS".to_string())
        }
        Err(_) => Err("FAILED".to_string()),
    }
}

#[tauri::command]
fn get_samp_favorite_list() -> String {
    samp::get_samp_favorite_list()
}

#[tauri::command]
fn toggle_drpc(toggle: bool) -> () {
    discord::toggle_drpc(toggle);
}

#[tauri::command]
fn get_checksum_of_files(list: Vec<&str>) -> Vec<String> {
    let mut result = Vec::<String>::new();
    for file in list {
        let mut f = File::open(file).unwrap();
        let mut contents = Vec::<u8>::new();
        f.read_to_end(&mut contents).unwrap();
        let digest = compute(&contents.as_slice());
        let mut combine = file.to_string().to_owned();
        combine.push_str("|");
        combine.push_str(format!("{:x}", digest).as_str());
        result.push(combine);
    }
    result
}

#[tauri::command]
fn extract_7z(path: &str, output_path: &str) -> Result<String, String> {
    match decompress_file(path, output_path) {
        Ok(_) => Ok("success".to_string()),
        Err(e) => Err(e.to_string()),
    }
}

#[tauri::command]
fn copy_files_to_gtasa(src: &str, gtasa_dir: &str) -> Result<(), String> {
    helpers::copy_files(src, gtasa_dir)
}

fn main() {
    simple_logging::log_to_file("omp-launcher.log", LevelFilter::Info).unwrap();

    discord::initialize_drpc();
    tauri::Builder::default()
        .plugin(tauri_plugin_upload::init())
        .setup(|app| {
            let main_window = app.get_window("main").unwrap();
            main_window
                .set_min_size(Some(PhysicalSize::new(1000, 700)))
                .unwrap();
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            request_server_info,
            request_server_players,
            request_server_rules,
            request_server_omp_extra_info,
            ping_server,
            inject,
            get_gtasa_path_from_samp,
            get_nickname_from_samp,
            rerun_as_admin,
            get_samp_favorite_list,
            toggle_drpc,
            get_checksum_of_files,
            extract_7z,
            copy_files_to_gtasa,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
