use std::fs;
use std::{path::PathBuf, sync::Mutex};
use std::error::Error;
use actix_web::{web, HttpResponse, Responder};
use lazy_static::lazy_static;
use serde::Deserialize;
use serde_json::{json, Value};
use tokio::sync::Semaphore;

static STORAGE_FILE: Mutex<Option<PathBuf>> = Mutex::new(None);

lazy_static! {
    static ref SEMAPHORE: Semaphore = Semaphore::new(1);
}

#[derive(Deserialize)]
pub struct RpcParams {
    params: serde_json::Value,
}

#[derive(Deserialize)]
pub struct RpcMethod {
    method: String,
}

#[derive(Deserialize)]
struct StorageGetOrRemoveItemParams {
    key: String,
}

#[derive(Deserialize)]
struct StorageSetItemParams {
    key: String,
    value: String,
}

fn storage_get_item(key: String) -> Result<Option<String>, String> {
    init_storage_file();
    let storage_file = STORAGE_FILE.lock().unwrap().to_owned().unwrap();
    ensure_storage_file(&storage_file)?;

    let data = fs::read_to_string(&storage_file).map_err(|e| e.to_string())?;
    let json_data: Value = serde_json::from_str(&data).map_err(|e| e.to_string())?;

    Ok(json_data
        .get(&key)
        .and_then(|v| v.as_str().map(|s| s.to_string())))
}

fn storage_set_item(key: String, value: String) -> Result<(), String> {
    init_storage_file();
    let storage_file = STORAGE_FILE.lock().unwrap().to_owned().unwrap();
    ensure_storage_file(&storage_file)?;

    let data = fs::read_to_string(&storage_file).map_err(|e| e.to_string())?;
    let mut json_data: Value = serde_json::from_str(&data).map_err(|e| e.to_string())?;

    json_data[key] = json!(value);

    fs::write(storage_file, json_data.to_string()).map_err(|e| e.to_string())?;
    Ok(())
}

fn storage_remove_item(key: String) -> Result<(), String> {
    init_storage_file();
    let storage_file = STORAGE_FILE.lock().unwrap().to_owned().unwrap();
    ensure_storage_file(&storage_file)?;

    let data = fs::read_to_string(&storage_file).map_err(|e| e.to_string())?;
    let mut json_data: Value = serde_json::from_str(&data).map_err(|e| e.to_string())?;

    json_data.as_object_mut().map(|map| map.remove(&key));

    fs::write(storage_file, json_data.to_string()).map_err(|e| e.to_string())?;
    Ok(())
}

fn storage_get_all_items() -> Result<String, String> {
    init_storage_file();
    let storage_file = STORAGE_FILE.lock().unwrap().to_owned().unwrap();
    ensure_storage_file(&storage_file)?;

    let data = fs::read_to_string(&storage_file).unwrap_or_else(|_| "{}".to_string());
    Ok(data)
}

fn storage_clear() -> Result<(), String> {
    init_storage_file();
    let storage_file = STORAGE_FILE.lock().unwrap().to_owned().unwrap();
    ensure_storage_file(&storage_file)?;

    fs::write(storage_file, "{}").map_err(|e| e.to_string())?;
    Ok(())
}

pub async fn sync_storage_rpc_handler(
    path: web::Path<RpcMethod>,
    payload: web::Json<RpcParams>,
) -> Result<impl Responder, Box<dyn Error>> {
    let _permit = SEMAPHORE.acquire().await.unwrap(); // Acquire a permit to ensure only one request is processed at a time
    let params_str = serde_json::to_string(&payload.params)?;

    /*
     method: storage_get_item
    */
    if path.method == "storage_get_item" {
        let params: StorageGetOrRemoveItemParams = serde_json::from_str(params_str.as_str())?;
        let result = storage_get_item(params.key);
        if result.is_err() {
            return Ok(
                HttpResponse::Ok().body(format!("storage_error|sep|{}", result.err().unwrap()))
            );
        }

        return resolve_option_for_http_response(result.unwrap());
    }
    /*
     method: storage_remove_item
    */
    else if path.method == "storage_remove_item" {
        let params: StorageGetOrRemoveItemParams = serde_json::from_str(params_str.as_str())?;
        let result = storage_remove_item(params.key);
        if result.is_err() {
            return Ok(
                HttpResponse::Ok().body(format!("storage_error|sep|{}", result.err().unwrap()))
            );
        }

        return Ok(HttpResponse::Ok().body("{}"));
    }
    /*
     method: storage_set_item
    */
    else if path.method == "storage_set_item" {
        let params: StorageSetItemParams = serde_json::from_str(params_str.as_str())?;
        let result = storage_set_item(params.key, params.value);
        if result.is_err() {
            return Ok(
                HttpResponse::Ok().body(format!("storage_error|sep|{}", result.err().unwrap()))
            );
        }

        return Ok(HttpResponse::Ok().body("{}"));
    }
    /*
     method: storage_get_all_items
    */
    else if path.method == "storage_get_all_items" {
        let result = storage_get_all_items();
        if result.is_err() {
            return Ok(
                HttpResponse::Ok().body(format!("storage_error|sep|{}", result.err().unwrap()))
            );
        }

        return Ok(HttpResponse::Ok().body(result.unwrap()));
    }
    /*
     method: storage_clear
    */
    else if path.method == "storage_clear" {
        let result = storage_clear();
        if result.is_err() {
            return Ok(
                HttpResponse::Ok().body(format!("storage_error|sep|{}", result.err().unwrap()))
            );
        }

        return Ok(HttpResponse::Ok().body("{}"));
    }

    let response = format!(
        "Received RPC request: {} with params: {:?}",
        path.method, payload.params
    );
    Ok(HttpResponse::Ok().body(response))
}

fn ensure_storage_file(storage_file: &PathBuf) -> Result<(), String> {
    if !storage_file.exists() {
        // Create an empty JSON file
        fs::write(storage_file, "{}").map_err(|e| e.to_string())?;
    }
    Ok(())
}

fn init_storage_file() {
    let mut storage_file_guard = STORAGE_FILE.lock().unwrap();
    if storage_file_guard.is_none() {
        *storage_file_guard = Some(PathBuf::from(format!(
            "{}/mp.open.launcher/storage.json",
            dirs_next::data_local_dir().unwrap().to_str().unwrap()
        )));
    }
}

fn resolve_option_for_http_response(
    option: Option<String>,
) -> Result<HttpResponse, Box<dyn Error>> {
    match option {
        Some(res) => Ok(HttpResponse::Ok().body(res)),
        None => Ok(HttpResponse::Ok().body("null")),
    }
}
