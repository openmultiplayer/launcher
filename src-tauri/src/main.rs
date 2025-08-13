// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod cli;
mod commands;
mod constants;
mod errors;
mod helpers;
mod injector;
mod ipc;
mod query;
mod rpcs;
mod samp;
mod validation;

#[path = "deeplink/lib.rs"]
#[cfg(target_os = "windows")]
mod deeplink;

use std::env;
use std::process::exit;
use std::sync::Mutex;

use cli::CliArgs;
use constants::*;
use errors::{LauncherError, Result};
use gumdrop::Options;
use injector::run_samp;
use log::{error, info, LevelFilter};
use std::fs;
use tauri::api::path::app_data_dir;
use tauri::Manager;
use tauri::PhysicalSize;

static URI_SCHEME_VALUE: Mutex<String> = Mutex::new(String::new());

#[tauri::command]
async fn get_uri_scheme_value() -> String {
    URI_SCHEME_VALUE.lock().unwrap().clone()
}

#[tokio::main]
async fn main() {
    // let mut f =
    //     std::fs::File::open("D:\\Projects\\open.mp\\Launcher-tauri\\omp-launcher\\omp-client.dll")
    //         .unwrap();
    // let mut contents = Vec::<u8>::new();
    // f.read_to_end(&mut contents).unwrap();
    // let digest = md5::compute(contents.as_slice());
    // println!("{:x}", digest);

    #[cfg(windows)]
    {
        deeplink::prepare(DEEPLINK_IDENTIFIER);
    }

    if let Err(e) = simple_logging::log_to_file(LOG_FILE_NAME, LevelFilter::Info) {
        eprintln!("Failed to initialize logging: {}", e);
        exit(1);
    }

    #[cfg(windows)]
    {
        #[cfg(not(debug_assertions))]
        {
            use windows::Win32::System::Console::{AttachConsole, ATTACH_PARENT_PROCESS};
            let _ = unsafe { AttachConsole(ATTACH_PARENT_PROCESS) };
        }
    }

    if let Err(e) = handle_cli_args().await {
        error!("CLI error: {}", e);
        exit(1);
    }

    #[cfg(windows)]
    {
        #[cfg(not(debug_assertions))]
        {
            use windows::Win32::System::Console::FreeConsole;
            let _ = unsafe { FreeConsole() };
        }
    }

    std::thread::spawn(move || match actix_rt::Runtime::new() {
        Ok(rt) => {
            if let Err(e) = rt.block_on(rpcs::initialize_rpc()) {
                error!("Failed to initialize RPC server: {}", e);
            }
        }
        Err(e) => {
            error!("Failed to create async runtime: {}", e);
        }
    });

    if let Err(e) = run_tauri_app().await {
        error!("Failed to run Tauri app: {}", e);
        exit(1);
    }
}

async fn handle_cli_args() -> Result<()> {
    let raw_args: Vec<String> = env::args().collect();
    let parse_result = CliArgs::parse_args_default::<String>(&raw_args[1..]);

    match parse_result {
        Ok(args) => {
            args.validate()?;

            if args.help {
                CliArgs::print_help_and_exit(&raw_args[0]);
            }

            if args.has_game_launch_args() {
                let gamepath = args.gamepath.as_ref().unwrap();
                let password = args.get_password();

                let omp_client_path = format!(
                    "{}/{}/omp/{}",
                    dirs_next::data_local_dir()
                        .ok_or(LauncherError::InternalError(
                            "Failed to get data directory".to_string()
                        ))?
                        .to_str()
                        .ok_or(LauncherError::InternalError(
                            "Invalid data directory path".to_string()
                        ))?,
                    DATA_DIR_NAME,
                    OMP_CLIENT_DLL
                );

                run_samp(
                    args.name.as_ref().unwrap(),
                    args.host.as_ref().unwrap(),
                    args.port.unwrap(),
                    gamepath,
                    &format!("{}/{}", gamepath, SAMP_DLL),
                    &omp_client_path,
                    &password,
                    true,
                )
                .await
                .map_err(|e| LauncherError::InternalError(e.to_string()))?;

                info!("Successfully launched game from command line");
                exit(0);
            }
        }
        Err(e) => {
            if raw_args.len() > 1
                && (raw_args[1].contains("omp://") || raw_args[1].contains("samp://"))
            {
                if let Ok(mut uri_scheme_value) = URI_SCHEME_VALUE.lock() {
                    *uri_scheme_value = raw_args[1].clone();
                }
            } else {
                info!("Invalid CLI arguments: {}", e);
            }
        }
    }

    Ok(())
}

async fn run_tauri_app() -> Result<()> {
    let builder_result = tauri::Builder::default()
        .plugin(tauri_plugin_upload::init())
        .setup(setup_tauri_app)
        .invoke_handler(tauri::generate_handler![
            get_uri_scheme_value,
            commands::inject,
            commands::get_gtasa_path_from_samp,
            commands::get_nickname_from_samp,
            commands::get_samp_favorite_list,
            commands::rerun_as_admin,
            commands::resolve_hostname,
            commands::is_process_alive,
            commands::log,
            query::query_server,
            ipc::send_message_to_game
        ])
        .run(tauri::generate_context!());

    match builder_result {
        Ok(_) => Ok(()),
        Err(e) => Err(LauncherError::InternalError(format!(
            "Tauri initialization failed: {}",
            e
        ))),
    }
}

fn setup_tauri_app(app: &mut tauri::App) -> std::result::Result<(), Box<dyn std::error::Error>> {
    let handle = app.handle();

    if let Some(main_window) = app.get_window("main") {
        main_window.set_min_size(Some(PhysicalSize::new(WINDOW_MIN_WIDTH, WINDOW_MIN_HEIGHT)))?;
    }

    let config = handle.config();
    if let Some(path) = app_data_dir(&config) {
        fs::create_dir_all(&path).map_err(|e| {
            error!("Failed to create app data directory: {}", e);
            e
        })?;
    }

    #[cfg(windows)]
    setup_deeplinks(handle.clone())?;

    ipc::listen_for_ipc(handle);
    Ok(())
}

#[cfg(windows)]
fn setup_deeplinks(
    handle: tauri::AppHandle,
) -> std::result::Result<(), Box<dyn std::error::Error>> {
    let handle_omp = handle.clone();
    let handle_samp = handle.clone();

    deeplink::register(DEEPLINK_SCHEME_OMP, move |request| {
        info!("Received OMP deeplink: {}", request);
        if let Ok(mut uri_value) = URI_SCHEME_VALUE.lock() {
            *uri_value = request.clone();
        }
        let _ = handle_omp.emit_all("scheme-request-received", &request);
    })?;

    deeplink::register(DEEPLINK_SCHEME_SAMP, move |request| {
        info!("Received SAMP deeplink: {}", request);
        if let Ok(mut uri_value) = URI_SCHEME_VALUE.lock() {
            *uri_value = request.clone();
        }
        let _ = handle_samp.emit_all("scheme-request-received", &request);
    })?;

    Ok(())
}
