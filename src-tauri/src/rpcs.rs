use actix_cors::Cors;
use actix_web::{web, App, HttpResponse, HttpServer, Responder};
use lazy_static::lazy_static;
use md5::compute;
use serde::Deserialize;
use serde_json::{json, Value};
use sevenz_rust::decompress_file;
use std::error::Error;
use std::fs;
use std::fs::File;
use std::io::Read;
use std::path::PathBuf;
use std::sync::Mutex;
use std::time::Instant;
use tokio::sync::Semaphore;

use crate::helpers;
use crate::query;

static STORAGE_FILE: Mutex<Option<PathBuf>> = Mutex::new(None);

lazy_static! {
    static ref SEMAPHORE: Semaphore = Semaphore::new(1);
}

#[derive(Deserialize)]
struct RpcParams {
    params: serde_json::Value,
}

#[derive(Deserialize)]
struct RpcMethod {
    method: String,
}

#[derive(Deserialize)]
struct ServerQueryMethodParams {
    ip: String,
    port: i32,
}

#[derive(Deserialize)]
struct GetChecksumOfFilesParams {
    list: Vec<String>,
}

#[derive(Deserialize)]
struct Extract7zParams {
    path: String,
    output_path: String,
}

#[derive(Deserialize)]
struct CopyFilesToGtaSaParams {
    src: String,
    gtasa_dir: String,
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

fn get_checksum_of_files(list: Vec<String>) -> Vec<String> {
    let mut result = Vec::<String>::new();
    for file in list {
        let file_path = file.to_owned();
        let mut f = File::open(file_path).unwrap();
        let mut contents = Vec::<u8>::new();
        f.read_to_end(&mut contents).unwrap();
        let digest = compute(contents.as_slice());
        let mut combine = String::new();
        combine.push_str(file.as_str());
        combine.push('|');
        combine.push_str(format!("{:x}", digest).as_str());
        result.push(combine.to_string());
    }
    result
}

fn extract_7z(path: &str, output_path: &str) -> Result<String, String> {
    match decompress_file(path, output_path) {
        Ok(_) => Ok("success".to_string()),
        Err(e) => Err(e.to_string()),
    }
}

fn copy_files_to_gtasa(src: &str, gtasa_dir: &str) -> Result<(), String> {
    helpers::copy_files(src, gtasa_dir)
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

async fn rpc_handler(
    path: web::Path<RpcMethod>,
    payload: web::Json<RpcParams>,
) -> Result<impl Responder, Box<dyn Error>> {
    let params_str = serde_json::to_string(&payload.params)?;

    /*
     method: request_server_info
    */
    if path.method == "request_server_info" {
        let params: ServerQueryMethodParams = serde_json::from_str(params_str.as_str())?;
        let result = request_server_info(params.ip.as_str(), params.port).await;
        if result.is_err() {
            return Ok(HttpResponse::Ok().body(result?));
        }
        return Ok(HttpResponse::Ok().body(result?));
    }
    /*
     method: ping_server
    */
    else if path.method == "ping_server" {
        let params: ServerQueryMethodParams = serde_json::from_str(params_str.as_str())?;
        let result = ping_server(params.ip.as_str(), params.port).await;
        if result.is_err() {
            return Ok(HttpResponse::Ok().body(result?.to_string()));
        }
        return Ok(HttpResponse::Ok().body(result?.to_string()));
    }
    /*
     method: request_server_players
    */
    else if path.method == "request_server_players" {
        let params: ServerQueryMethodParams = serde_json::from_str(params_str.as_str()).unwrap();
        let result = request_server_players(params.ip.as_str(), params.port).await;
        if result.is_err() {
            return Ok(HttpResponse::Ok().body(result?));
        }
        return Ok(HttpResponse::Ok().body(result?));
    }
    /*
     method: request_server_rules
    */
    else if path.method == "request_server_rules" {
        let params: ServerQueryMethodParams = serde_json::from_str(params_str.as_str())?;
        let result = request_server_rules(params.ip.as_str(), params.port).await;
        if result.is_err() {
            return Ok(HttpResponse::Ok().body(result?));
        }
        return Ok(HttpResponse::Ok().body(result?));
    }
    /*
     method: request_server_omp_extra_info
    */
    else if path.method == "request_server_omp_extra_info" {
        let params: ServerQueryMethodParams = serde_json::from_str(params_str.as_str())?;
        let result = request_server_omp_extra_info(params.ip.as_str(), params.port).await;
        if result.is_err() {
            return Ok(HttpResponse::Ok().body(result?));
        }
        return Ok(HttpResponse::Ok().body(result?));
    }
    /*
     method: get_checksum_of_files
    */
    else if path.method == "get_checksum_of_files" {
        let params: GetChecksumOfFilesParams = serde_json::from_str(params_str.as_str())?;
        let result = get_checksum_of_files(params.list);
        return Ok(HttpResponse::Ok().body(serde_json::to_string(&json!(result))?));
    }
    /*
     method: extract_7z
    */
    else if path.method == "extract_7z" {
        let params: Extract7zParams = serde_json::from_str(params_str.as_str())?;
        extract_7z(params.path.as_str(), &params.output_path)?;
        return Ok(HttpResponse::Ok().body("{}"));
    }
    /*
     method: copy_files_to_gtasa
    */
    else if path.method == "copy_files_to_gtasa" {
        let params: CopyFilesToGtaSaParams = serde_json::from_str(params_str.as_str())?;
        let result = copy_files_to_gtasa(params.src.as_str(), params.gtasa_dir.as_str());
        if result.is_err() {
            return Ok(HttpResponse::Ok().body(result.err().unwrap()));
        }
        return Ok(HttpResponse::Ok().body("{}"));
    }

    let response = format!(
        "Received RPC request: {} with params: {:?}",
        path.method, payload.params
    );
    Ok(HttpResponse::Ok().body(response))
}

async fn sync_rpc_handler(
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

pub async fn initialize_rpc() -> Result<(), std::io::Error> {
    HttpServer::new(|| {
        App::new()
            .wrap(Cors::permissive())
            .service(web::resource("/sync_rpc/{method}").route(web::post().to(sync_rpc_handler)))
            .service(web::resource("/rpc/{method}").route(web::post().to(rpc_handler)))
    })
    .bind("127.0.0.1:46290")?
    .run()
    .await
}

fn resolve_option_for_http_response(
    option: Option<String>,
) -> Result<HttpResponse, Box<dyn Error>> {
    match option {
        Some(res) => Ok(HttpResponse::Ok().body(res)),
        None => Ok(HttpResponse::Ok().body("null")),
    }
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
            "{}/com.open.mp/storage.json",
            dirs_next::data_local_dir().unwrap().to_str().unwrap()
        )));
    }
}
