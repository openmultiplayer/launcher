use once_cell::sync::Lazy;
use std::collections::HashMap;
use std::io::BufRead;
use std::net::TcpListener;
use std::net::TcpStream;
use std::sync::{Arc, Mutex};
use std::thread;
use tauri::{AppHandle, Manager, WindowBuilder, WindowUrl};

type SharedStreams = Arc<Mutex<HashMap<i32, TcpStream>>>;

pub static GAME_STREAMS: Lazy<SharedStreams> = Lazy::new(|| Arc::new(Mutex::new(HashMap::new())));

fn create_overlay_window(
    app: &tauri::AppHandle,
    label: &str,
    attached_id: i32,
) -> tauri::Result<()> {
    match WindowBuilder::new(
        app,
        label,
        WindowUrl::App(format!("index.html?attached_id={}", attached_id).into()),
    )
    .transparent(true)
    .decorations(false)
    .always_on_top(false)
    .resizable(false)
    .visible(true)
    .position(-1000.0, -1000.0)
    .skip_taskbar(true)
    .build()
    {
        Ok(window) => {
            let _ = window.set_title(label);
        }
        Err(err) => {
            println!("{}", err.to_string());
        }
    }

    Ok(())
}

pub fn listen_for_ipc(app_handle: AppHandle) {
    thread::spawn(move || {
        let listener = TcpListener::bind("127.0.0.1:45791").expect("Failed to bind to port 45791");

        for stream in listener.incoming() {
            if let Ok(stream) = stream {
                let handle = app_handle.clone();

                thread::spawn(move || {
                    let mut reader = std::io::BufReader::new(stream.try_clone().unwrap());
                    let mut line = String::new();
                    while let Ok(bytes) = reader.read_line(&mut line) {
                        if bytes == 0 {
                            break;
                        }

                        if line.starts_with("init:") {
                            if let Some(pid) = line
                                .strip_prefix("init:")
                                .and_then(|s| s.trim().parse::<i32>().ok())
                            {
                                GAME_STREAMS
                                    .lock()
                                    .unwrap()
                                    .insert(pid, stream.try_clone().unwrap());
                            }
                        } else {
                            if line.starts_with("pos:") {
                                if let Some(coords) = line.strip_prefix("pos:") {
                                    let parts: Vec<_> = coords.trim().split(',').collect();
                                    if parts.len() == 5 {
                                        if let (Ok(_x), Ok(_y), Ok(w), Ok(h), Ok(pid)) = (
                                            parts[0].parse::<i32>(),
                                            parts[1].parse::<i32>(),
                                            parts[2].parse::<i32>(),
                                            parts[3].parse::<i32>(),
                                            parts[4].parse::<i32>(),
                                        ) {
                                            if let Some(win) = handle.get_window(
                                                format!("omp_overlay_window:{}", pid).as_str(),
                                            ) {
                                                let _ = win.set_position(tauri::PhysicalPosition {
                                                    x: -1 * w - 1000,
                                                    y: -1 * h - 1000,
                                                });

                                                let _ = win.set_size(tauri::PhysicalSize {
                                                    width: w as u32,
                                                    height: h as u32,
                                                });
                                            }
                                        }
                                    }
                                }
                            } else if line.starts_with("show_overlay:") {
                                let parts: Vec<_> = line.trim().split(':').collect();
                                create_overlay_window(
                                    &handle,
                                    format!("omp_overlay_window:{}", parts[1]).as_str(),
                                    parts[1].parse::<i32>().unwrap(),
                                )
                                .unwrap();
                            } else if line.starts_with("hide_overlay:") {
                                let parts: Vec<_> = line.trim().split(':').collect();
                                if let Some(window) = handle
                                    .get_window(format!("omp_overlay_window:{}", parts[1]).as_str())
                                {
                                    let _ = window.close();
                                } else {
                                    println!(
                                        "hidden_overlay: window not found: {}",
                                        format!("omp_overlay_window:{}", parts[1]).as_str()
                                    );
                                }
                            } else {
                                println!("Unknown IPC command: {line}");
                            }
                        }
                        line.clear();
                    }
                });
            }
        }
    });
}

#[tauri::command]
pub fn send_message_to_game(id: i32, message: &str) -> Result<(), String> {
    use std::io::Write;

    let mut map = GAME_STREAMS
        .lock()
        .map_err(|_| "Failed to lock stream map")?;

    if let Some(stream) = map.get_mut(&id) {
        let full_message = format!("{}\n", message);
        stream
            .write_all(full_message.as_bytes())
            .map_err(|e| format!("Failed to write to stream: {}", e))?;
        Ok(())
    } else {
        println!("no_stream_found for {}", id);
        Err("no_stream_found".to_string())
    }
}
