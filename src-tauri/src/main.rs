// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]
// use serde_json::json;
mod injector;
mod query;
mod samp;

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
                Err(e) => Err(e.to_string()),
            }
        }
        Err(e) => Err(e.to_string()),
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
async fn request_server_is_omp(ip: &str, port: i32) -> Result<String, String> {
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
                Err(e) => Err(e.to_string()),
            }
        }
        Err(e) => Err(e.to_string()),
    }
}

#[tauri::command]
fn inject(name: &str, ip: &str, port: i32, exe: &str, dll: &str, password: &str) -> () {
    injector::run_samp(name, ip, port, exe, dll, password).unwrap();
}

#[tauri::command]
fn get_gtasa_path_from_samp() -> String {
    samp::get_gtasa_path().to_string()
}

#[tauri::command]
fn get_nickname_from_samp() -> String {
    samp::get_nickname().to_string()
}

fn main() {
    tauri::Builder::default()
        .setup(|app| {
            let main_window = app.get_window("main").unwrap();
            main_window
                .set_min_size(Some(PhysicalSize::new(900, 600)))
                .unwrap();
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            request_server_info,
            request_server_players,
            request_server_rules,
            request_server_is_omp,
            ping_server,
            inject,
            get_gtasa_path_from_samp,
            get_nickname_from_samp
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
