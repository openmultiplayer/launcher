// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]
// use serde_json::json;
mod background_thread;
mod commands;
mod helpers;
mod injector;
mod query;
mod rpcs;
mod samp;

use std::env;
use std::process::exit;
use std::sync::Mutex;

use background_thread::initialize_background_thread;
use gumdrop::Options;
use injector::run_samp;
use log::{error, info, LevelFilter};
// use std::io::Read;
use tauri::Manager;
use tauri::PhysicalSize;

#[path = "deeplink/lib.rs"]
mod deeplink;

#[derive(Debug, Options)]
struct CliArgs {
    #[options(no_short, help = "print help message")]
    help: bool,

    #[options(help = "target server IP address")]
    host: Option<String>,

    #[options(help = "target server port")]
    port: Option<i32>,

    #[options(help = "target server password")]
    password: Option<String>,

    #[options(help = "nickname to join server with")]
    name: Option<String>,

    #[options(help = "game path to use for both game executable and samp.dll")]
    gamepath: Option<String>,
}

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

    deeplink::prepare("mp.open.launcher");
    simple_logging::log_to_file("omp-launcher.log", LevelFilter::Info).unwrap();

    #[cfg(windows)]
    {
        #[cfg(not(debug_assertions))]
        {
            use windows::Win32::System::Console::{AttachConsole, ATTACH_PARENT_PROCESS};
            let _ = unsafe { AttachConsole(ATTACH_PARENT_PROCESS) };
        }
    }

    let raw_args: Vec<String> = env::args().collect();
    let parse_args_result = CliArgs::parse_args_default::<String>(&raw_args[1..]);
    match parse_args_result {
        Ok(args) => {
            if args.help {
                println!(
                    "Open Multiplayer Launcher

Usage: {} [OPTIONS]

Options:
      --help
  -h, --host <HOST>          Server IP
  -p, --port <PORT>          Server port
  -P, --password <PASSWORD>  Server password
  -n, --name <NAME>          Nickname
  -g, --gamepath <GAMEPATH>  Game path
                ",
                    raw_args[0]
                );
                exit(0)
            }

            if args.host.is_some() && args.name.is_some() && args.port.is_some() {
                if args.gamepath.is_some() && args.gamepath.as_ref().unwrap().len() > 0 {
                    let password : String = if args.password.is_some() { 
                        args.password.unwrap()
                    } else { 
                        "".to_string()
                    };
                    let _ = run_samp(
                        args.name.unwrap().as_str(),
                        args.host.unwrap().as_str(),
                        args.port.unwrap(),
                        args.gamepath.as_ref().unwrap().as_str(),
                        format!("{}/samp.dll", args.gamepath.as_ref().unwrap()).as_str(),
                        format!(
                            "{}/mp.open.launcher/omp/omp-client.dll",
                            dirs_next::data_local_dir().unwrap().to_str().unwrap()
                        )
                        .as_str(),
                        &password,
                    )
                    .await;
                    info!("Attempted to run the game from command line");
                    exit(0)
                } else {
                    println!("You must provide game path using --game or -g. Read more about arguments in --help");
                    info!("You must provide game path using --game or -g. Read more about arguments in --help");
                    exit(0)
                }
            }
        }
        Err(e) => {
            if raw_args[1].contains("omp://") || raw_args[1].contains("samp://") {
                let mut uri_scheme_value = URI_SCHEME_VALUE.lock().unwrap();
                *uri_scheme_value = String::from(raw_args[1].as_str());
            } else {
                info!("Unknown argument has been passed: {}", e);
            }
        }
    };

    #[cfg(windows)]
    {
        #[cfg(not(debug_assertions))]
        {
            use windows::Win32::System::Console::FreeConsole;
            let _ = unsafe { FreeConsole() };
        }
    }

    initialize_background_thread();
    std::thread::spawn(move || {
        let rt = actix_rt::Runtime::new().unwrap();
        let _ = rt.block_on(rpcs::initialize_rpc());
    });

    match tauri::Builder::default()
        .plugin(tauri_plugin_upload::init())
        .setup(|app| {
            let handle = app.handle();
            let handle2 = app.handle();
            let main_window = app.get_window("main").unwrap();
            main_window
                .set_min_size(Some(PhysicalSize::new(1000, 700)))
                .unwrap();

            deeplink::register("omp", move |request| {
                dbg!(&request);
                let mut uri_scheme_value = URI_SCHEME_VALUE.lock().unwrap();
                *uri_scheme_value = String::from(request.as_str());
                handle.emit_all("scheme-request-received", request).unwrap();
            })
            .unwrap();

            deeplink::register("samp", move |request| {
                dbg!(&request);
                let mut uri_scheme_value = URI_SCHEME_VALUE.lock().unwrap();
                (*uri_scheme_value).clone_from(&request);
                *uri_scheme_value = String::from(request.as_str());
                handle2
                    .emit_all("scheme-request-received", request)
                    .unwrap();
            })
            .unwrap();

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            get_uri_scheme_value,
            commands::inject,
            commands::get_gtasa_path_from_samp,
            commands::get_nickname_from_samp,
            commands::get_samp_favorite_list,
            commands::rerun_as_admin
        ])
        .run(tauri::generate_context!())
    {
        Ok(_) => {}
        Err(e) => {
            error!("[main.rs] Running tauri instance failed: {}", e.to_string());
        }
    };
}
