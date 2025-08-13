use once_cell::sync::Lazy;
use std::collections::HashMap;
use std::io::BufRead;
use std::net::{TcpListener, TcpStream};
use std::sync::{Arc, Mutex};
use std::thread;
use tauri::{AppHandle, Manager, WindowBuilder, WindowUrl};

use crate::{constants::*, errors::*};

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
        let listener = TcpListener::bind(format!("127.0.0.1:{}", IPC_PORT))
            .expect("Failed to bind to IPC port");

        for stream in listener.incoming() {
            if let Ok(stream) = stream {
                let handle = app_handle.clone();

                thread::spawn(move || {
                    let Ok(stream_clone) = stream.try_clone() else {
                        log::error!("Failed to clone IPC stream");
                        return;
                    };
                    let mut reader = std::io::BufReader::new(stream_clone);
                    let mut line = String::new();
                    while let Ok(bytes) = reader.read_line(&mut line) {
                        if bytes == 0 {
                            break;
                        }

                        if line.starts_with("init:") {
                            if let Some(pid_str) = line.strip_prefix("init:") {
                                if let Ok(pid) = pid_str.trim().parse::<i32>() {
                                    if let Ok(stream_clone) = stream.try_clone() {
                                        if let Ok(mut streams) = GAME_STREAMS.lock() {
                                            streams.insert(pid, stream_clone);
                                        }
                                    }
                                }
                            }
                        } else if line.starts_with("pos:") {
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
                                        let window_label = format!("omp_overlay_window:{}", pid);
                                        if let Some(win) = handle.get_window(&window_label) {
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
                            if parts.len() >= 2 {
                                if let Ok(pid) = parts[1].parse::<i32>() {
                                    let window_label = format!("omp_overlay_window:{}", pid);
                                    let _ = create_overlay_window(&handle, &window_label, pid);
                                }
                            }
                        } else if line.starts_with("hide_overlay:") {
                            let parts: Vec<_> = line.trim().split(':').collect();
                            if parts.len() >= 2 {
                                let window_label = format!("omp_overlay_window:{}", parts[1]);
                                if let Some(window) = handle.get_window(&window_label) {
                                    let _ = window.close();
                                } else {
                                    log::warn!("IPC overlay window not found: {}", window_label);
                                }
                            }
                        } else {
                            log::warn!("Unknown IPC command received: {}", line.trim());
                        }
                        line.clear();
                    }
                });
            }
        }
    });
}

#[tauri::command]
pub fn send_message_to_game(id: i32, message: &str) -> Result<()> {
    use std::io::Write;

    let mut streams = GAME_STREAMS.lock().map_err(|_| {
        crate::errors::LauncherError::InternalError("Failed to acquire stream lock".to_string())
    })?;

    if let Some(stream) = streams.get_mut(&id) {
        let full_message = format!("{}\n", message);
        stream.write_all(full_message.as_bytes()).map_err(|e| {
            crate::errors::LauncherError::Network(format!("Failed to write to stream: {}", e))
        })?;
        Ok(())
    } else {
        log::warn!("No IPC stream found for process ID: {}", id);
        Err(crate::errors::LauncherError::NotFound(
            "no_stream_found".to_string(),
        ))
    }
}
