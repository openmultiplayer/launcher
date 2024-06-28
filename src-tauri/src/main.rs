// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]
// use serde_json::json;
mod discord;
mod helpers;
mod injector;
mod query;
mod rpcs;
mod samp;

use std::process::exit;

use clap::Parser;
use injector::run_samp;
use log::LevelFilter;
use tauri::Manager;
use tauri::PhysicalSize;

/// Simple program to greet a person
#[derive(Parser, Debug)]
#[command(version, about, long_about = None)]
#[clap(disable_help_flag = true)]
struct Args {
    #[clap(long, action = clap::ArgAction::HelpLong)]
    help: Option<bool>,

    /// Server IP
    #[arg(short, long, default_value_t = String::new())]
    host: String,

    /// Server port
    #[arg(short, long, default_value_t = 0)]
    port: i32,

    /// Nickname
    #[arg(short, long, default_value_t = String::new())]
    name: String,

    /// Game path
    #[arg(short, long, default_value_t = String::new())]
    gamepath: String,
}

// Learn more about Tauri commands at https://tauri.app/v1/guides/features/command
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
    samp::get_gtasa_path()
}

#[tauri::command]
fn get_nickname_from_samp() -> String {
    samp::get_nickname()
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

#[tokio::main]
async fn main() {
    simple_logging::log_to_file("omp-launcher.log", LevelFilter::Info).unwrap();

    let args = Args::parse();
    if args.host.len() > 0 && args.name.len() > 0 && args.port > 0 {
        if args.gamepath.len() > 0 {
            let _ = run_samp(
                args.name.as_str(),
                args.host.as_str(),
                args.port,
                args.gamepath.as_str(),
                format!("{}/samp.dll", args.gamepath).as_str(),
                "",
            )
            .await;
            exit(0)
        } else {
            println!("You must provide game path using --game or -g. Read more about arguments in --help");
            exit(0)
        }
    }

    std::thread::spawn(move || {
        let rt = actix_rt::Runtime::new().unwrap();
        let _ = rt.block_on(rpcs::initialize_rpc());
    });

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
            inject,
            get_gtasa_path_from_samp,
            get_nickname_from_samp,
            rerun_as_admin,
            get_samp_favorite_list,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
