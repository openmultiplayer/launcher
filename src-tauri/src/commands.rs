use std::fs;
use std::path::PathBuf;

use serde_json::{json, Value};
use tauri::State;

use crate::{injector, samp};

#[derive(Default)]
pub struct AppState {
    storage_file: PathBuf,
}

#[tauri::command]
pub fn get_item(state: State<AppState>, key: String) -> Result<Option<String>, String> {
    let storage_file = state.storage_file.clone();
    let data = fs::read_to_string(&storage_file).map_err(|e| e.to_string())?;
    let json_data: Value = serde_json::from_str(&data).map_err(|e| e.to_string())?;

    Ok(json_data
        .get(&key)
        .and_then(|v| v.as_str().map(|s| s.to_string())))
}

#[tauri::command]
pub fn set_item(state: State<AppState>, key: String, value: String) -> Result<(), String> {
    let storage_file = state.storage_file.clone();
    let data = fs::read_to_string(&storage_file).map_err(|e| e.to_string())?;
    let mut json_data: Value = serde_json::from_str(&data).map_err(|e| e.to_string())?;

    json_data[key] = json!(value);

    fs::write(storage_file, json_data.to_string()).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn remove_item(state: State<AppState>, key: String) -> Result<(), String> {
    let storage_file = state.storage_file.clone();
    let data = fs::read_to_string(&storage_file).map_err(|e| e.to_string())?;
    let mut json_data: Value = serde_json::from_str(&data).map_err(|e| e.to_string())?;

    json_data.as_object_mut().map(|map| map.remove(&key));

    fs::write(storage_file, json_data.to_string()).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn get_all_items(state: State<AppState>) -> Result<String, String> {
    let storage_file = state.storage_file.clone();
    let data = fs::read_to_string(&storage_file).unwrap_or_else(|_| "{}".to_string());
    Ok(data)
}

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
            runas::Command::new(path).arg("").status().unwrap();
            Ok("SUCCESS".to_string())
        }
        Err(_) => Err("FAILED".to_string()),
    }
}

#[tauri::command]
pub fn get_samp_favorite_list() -> String {
    samp::get_samp_favorite_list()
}
