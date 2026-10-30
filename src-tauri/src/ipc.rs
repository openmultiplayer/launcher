use once_cell::sync::Lazy;
use std::collections::HashMap;
use std::io::{BufRead, Write};
use std::net::{TcpListener, TcpStream};
use std::sync::atomic::{AtomicBool, AtomicU64, Ordering};
use std::sync::{Arc, Mutex, OnceLock};
use std::thread;
use tauri::{AppHandle, Manager, WindowBuilder, WindowUrl};

use crate::constants::*;

struct GameClient {
    stream: TcpStream,
    overlay_window_id: Option<u32>,
    connection_id: u64,
}

type SharedClients = Arc<Mutex<HashMap<i32, GameClient>>>;

static GAME_CLIENTS: Lazy<SharedClients> = Lazy::new(|| Arc::new(Mutex::new(HashMap::new())));

static IPC_HANDLE: OnceLock<AppHandle> = OnceLock::new();
static IPC_STARTED: AtomicBool = AtomicBool::new(false);
static NEXT_CONNECTION_ID: AtomicU64 = AtomicU64::new(1);

pub fn init_ipc(app_handle: AppHandle) {
    let _ = IPC_HANDLE.set(app_handle);
}

pub fn ensure_listening() {
    if IPC_STARTED
        .compare_exchange(false, true, Ordering::SeqCst, Ordering::SeqCst)
        .is_err()
    {
        return;
    }
    if let Some(handle) = IPC_HANDLE.get() {
        listen_for_ipc(handle.clone());
    }
}

fn overlay_window_label(pid: i32) -> String {
    format!("omp_overlay_window:{}", pid)
}

#[cfg(windows)]
fn overlay_window_id(window: &tauri::Window) -> Option<u32> {
    // The game client is 32-bit. Windows handles are interoperable across bitness
    // using their lower 32 bits.
    window
        .hwnd()
        .ok()
        .map(|hwnd| hwnd.0 as u32)
        .filter(|id| *id != 0)
}

#[cfg(not(windows))]
fn overlay_window_id(_window: &tauri::Window) -> Option<u32> {
    None
}

fn is_current_client(pid: i32, connection_id: u64) -> bool {
    GAME_CLIENTS
        .lock()
        .ok()
        .and_then(|clients| {
            clients
                .get(&pid)
                .map(|client| client.connection_id == connection_id)
        })
        .unwrap_or(false)
}

fn send_overlay_window_id(pid: i32, connection_id: u64, id: Option<u32>) {
    if let Ok(mut clients) = GAME_CLIENTS.lock() {
        if let Some(client) = clients.get_mut(&pid) {
            if client.connection_id != connection_id {
                return;
            }
            client.overlay_window_id = id;
            let window_id = client.overlay_window_id.unwrap_or(0);
            if let Err(error) = writeln!(client.stream, "overlay_window_id:{}", window_id) {
                log::warn!("Failed to send overlay HWND to game {}: {}", pid, error);
            }
        }
    }
}

fn create_overlay_window(app: &tauri::AppHandle, pid: i32) -> Option<u32> {
    let label = overlay_window_label(pid);
    if let Some(window) = app.get_window(&label) {
        if crate::wine_overlay::reopen(&window) {
            return overlay_window_id(&window);
        }
        // Under Wine it is still closing (wine_overlay.rs): wait for it to go,
        // then build a new one, rather than handing the game a dying window
        for _ in 0..50 {
            if app.get_window(&label).is_none() {
                break;
            }
            std::thread::sleep(std::time::Duration::from_millis(20));
        }
        if let Some(window) = app.get_window(&label) {
            log::warn!("Overlay window for game {} is still closing", pid);
            return overlay_window_id(&window);
        }
    }

    let mut builder = WindowBuilder::new(
        app,
        label.as_str(),
        WindowUrl::App(format!("index.html?attached_id={}", pid).into()),
    );
    if let Some(args) = crate::wine::browser_args() {
        builder = builder.additional_browser_args(&args);
    }

    // Under Wine nothing stops a new window from taking the foreground, and the
    // full-screen game minimises when it loses it (wine_overlay.rs)
    let focused = !crate::wine::is_wine();

    match builder
        .transparent(true)
        .decorations(false)
        .always_on_top(false)
        .resizable(false)
        .visible(false)
        .focused(focused)
        .position(-10000.0, -10000.0)
        .skip_taskbar(true)
        .disable_file_drop_handler()
        .build()
    {
        Ok(window) => {
            let _ = window.set_title(&label);
            crate::wine_overlay::attach(&window, pid);
            overlay_window_id(&window)
        }
        Err(err) => {
            log::error!("Failed to create overlay window for game {}: {}", pid, err);
            None
        }
    }
}

pub fn listen_for_ipc(app_handle: AppHandle) {
    thread::spawn(move || {
        let listener = match TcpListener::bind(format!("127.0.0.1:{}", IPC_PORT)) {
            Ok(l) => l,
            Err(e) => {
                log::error!("Failed to bind to IPC port: {}", e);
                return;
            }
        };

        for stream in listener.incoming() {
            if let Ok(stream) = stream {
                let handle = app_handle.clone();

                thread::spawn(move || {
                    let connection_id = NEXT_CONNECTION_ID.fetch_add(1, Ordering::Relaxed);
                    let mut client_pid = None;
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
                                    if client_pid.is_none() && pid > 0 {
                                        if let Ok(stream_clone) = stream.try_clone() {
                                            if let Ok(mut clients) = GAME_CLIENTS.lock() {
                                                clients.insert(
                                                    pid,
                                                    GameClient {
                                                        stream: stream_clone,
                                                        overlay_window_id: None,
                                                        connection_id,
                                                    },
                                                );
                                                client_pid = Some(pid);
                                            }
                                        }
                                        if client_pid == Some(pid) {
                                            crate::wine_overlay::inject_hook(&handle, pid);
                                        }
                                        if client_pid == Some(pid) {
                                            if let Some(window) =
                                                handle.get_window(&overlay_window_label(pid))
                                            {
                                                send_overlay_window_id(
                                                    pid,
                                                    connection_id,
                                                    overlay_window_id(&window),
                                                );
                                            }
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
                                        if client_pid != Some(pid)
                                            || !is_current_client(pid, connection_id)
                                            || w <= 0
                                            || h <= 0
                                        {
                                            line.clear();
                                            continue;
                                        }
                                        if let Some(win) =
                                            handle.get_window(&overlay_window_label(pid))
                                        {
                                            // let _ = win.set_position(tauri::PhysicalPosition {
                                            //     x: -1 * w - 1000,
                                            //     y: -1 * h - 1000,
                                            // });

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
                                    if client_pid == Some(pid)
                                        && is_current_client(pid, connection_id)
                                    {
                                        let id = create_overlay_window(&handle, pid);
                                        send_overlay_window_id(pid, connection_id, id);
                                    }
                                }
                            }
                        } else if line.starts_with("hide_overlay:") {
                            let parts: Vec<_> = line.trim().split(':').collect();
                            if parts.len() >= 2 {
                                if let Ok(pid) = parts[1].parse::<i32>() {
                                    if client_pid == Some(pid)
                                        && is_current_client(pid, connection_id)
                                    {
                                        let window_label = overlay_window_label(pid);
                                        if let Some(window) = handle.get_window(&window_label) {
                                            crate::wine_overlay::close(&window);
                                        } else {
                                            log::warn!(
                                                "IPC overlay window not found: {}",
                                                window_label
                                            );
                                        }
                                        if let Ok(mut clients) = GAME_CLIENTS.lock() {
                                            if let Some(client) = clients.get_mut(&pid) {
                                                client.overlay_window_id = None;
                                            }
                                        }
                                    }
                                }
                            }
                        } else if line.trim() == "get_overlay_window_id" {
                            if let Some(pid) =
                                client_pid.filter(|pid| is_current_client(*pid, connection_id))
                            {
                                let id = handle
                                    .get_window(&overlay_window_label(pid))
                                    .and_then(|window| overlay_window_id(&window));
                                send_overlay_window_id(pid, connection_id, id);
                            }
                        } else {
                            log::warn!("Unknown IPC command received: {}", line.trim());
                        }
                        line.clear();
                    }

                    if let Some(pid) = client_pid {
                        if let Ok(mut clients) = GAME_CLIENTS.lock() {
                            if clients.get(&pid).map(|client| client.connection_id)
                                == Some(connection_id)
                            {
                                clients.remove(&pid);
                            }
                        }
                    }
                });
            }
        }
    });
}

#[tauri::command]
pub fn send_message_to_game(id: i32, message: &str) -> std::result::Result<(), String> {
    let mut clients = GAME_CLIENTS.lock().map_err(|_| {
        crate::errors::LauncherError::InternalError("Failed to acquire stream lock".to_string())
            .to_string()
    })?;

    if let Some(client) = clients.get_mut(&id) {
        let full_message = format!("{}\n", message);
        client
            .stream
            .write_all(full_message.as_bytes())
            .map_err(|e| {
                crate::errors::LauncherError::Network(format!("Failed to write to stream: {}", e))
                    .to_string()
            })?;
        return Ok(());
    } else {
        log::warn!("No IPC stream found for process ID: {}", id);
        return Err(
            crate::errors::LauncherError::NotFound("no_stream_found".to_string()).to_string(),
        );
    }
}
