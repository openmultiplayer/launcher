use actix_cors::Cors;
use actix_web::{web, App, HttpResponse, HttpServer, Responder};
use md5::compute;
use serde::Deserialize;
use serde_json::json;
use sevenz_rust::decompress_file;
use std::fs::File;
use std::io::Read;
use std::time::Instant;

use crate::query;
use crate::{discord, helpers};

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
struct ToggleDiscordRPCParams {
    toggle: bool,
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

fn toggle_drpc(toggle: bool) -> () {
    discord::toggle_drpc(toggle);
}

fn get_checksum_of_files(list: Vec<String>) -> Vec<String> {
    let mut result = Vec::<String>::new();
    for file in list {
        let file_path = file.to_owned();
        let mut f = File::open(file_path).unwrap();
        let mut contents = Vec::<u8>::new();
        f.read_to_end(&mut contents).unwrap();
        let digest = compute(&contents.as_slice());
        let mut combine = String::new();
        combine.push_str(file.as_str());
        combine.push_str("|");
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

async fn rpc_handler(path: web::Path<RpcMethod>, payload: web::Json<RpcParams>) -> impl Responder {
    let params_str = serde_json::to_string(&payload.params).unwrap();

    /*
     method: request_server_info
    */
    if path.method == "request_server_info" {
        let params: ServerQueryMethodParams = serde_json::from_str(params_str.as_str()).unwrap();
        let result = request_server_info(params.ip.as_str(), params.port).await;
        if result.is_err() {
            return HttpResponse::Ok().body(result.err().unwrap());
        }
        return HttpResponse::Ok().body(result.unwrap());
    }
    /*
     method: ping_server
    */
    else if path.method == "ping_server" {
        let params: ServerQueryMethodParams = serde_json::from_str(params_str.as_str()).unwrap();
        let result = ping_server(params.ip.as_str(), params.port).await;
        if result.is_err() {
            return HttpResponse::Ok().body(result.err().unwrap());
        }
        return HttpResponse::Ok().body(result.unwrap().to_string());
    }
    /*
     method: request_server_players
    */
    else if path.method == "request_server_players" {
        let params: ServerQueryMethodParams = serde_json::from_str(params_str.as_str()).unwrap();
        let result = request_server_players(params.ip.as_str(), params.port).await;
        if result.is_err() {
            return HttpResponse::Ok().body(result.err().unwrap());
        }
        return HttpResponse::Ok().body(result.unwrap().to_string());
    }
    /*
     method: request_server_rules
    */
    else if path.method == "request_server_rules" {
        let params: ServerQueryMethodParams = serde_json::from_str(params_str.as_str()).unwrap();
        let result = request_server_rules(params.ip.as_str(), params.port).await;
        if result.is_err() {
            return HttpResponse::Ok().body(result.err().unwrap());
        }
        return HttpResponse::Ok().body(result.unwrap().to_string());
    }
    /*
     method: request_server_omp_extra_info
    */
    else if path.method == "request_server_omp_extra_info" {
        let params: ServerQueryMethodParams = serde_json::from_str(params_str.as_str()).unwrap();
        let result = request_server_omp_extra_info(params.ip.as_str(), params.port).await;
        if result.is_err() {
            return HttpResponse::Ok().body(result.err().unwrap());
        }
        return HttpResponse::Ok().body(result.unwrap().to_string());
    }
    /*
     method: toggle_drpc
    */
    else if path.method == "toggle_drpc" {
        let params: ToggleDiscordRPCParams = serde_json::from_str(params_str.as_str()).unwrap();
        toggle_drpc(params.toggle);
        return HttpResponse::Ok().body("{}");
    }
    /*
     method: get_checksum_of_files
    */
    else if path.method == "get_checksum_of_files" {
        let params: GetChecksumOfFilesParams = serde_json::from_str(params_str.as_str()).unwrap();
        let result = get_checksum_of_files(params.list);
        return HttpResponse::Ok().body(serde_json::to_string(&json!(result)).unwrap());
    }
    /*
     method: extract_7z
    */
    else if path.method == "extract_7z" {
        let params: Extract7zParams = serde_json::from_str(params_str.as_str()).unwrap();
        extract_7z(params.path.as_str(), &params.output_path.as_str()).unwrap();
        return HttpResponse::Ok().body("{}");
    }
    /*
     method: copy_files_to_gtasa
    */
    else if path.method == "copy_files_to_gtasa" {
        let params: CopyFilesToGtaSaParams = serde_json::from_str(params_str.as_str()).unwrap();
        copy_files_to_gtasa(params.src.as_str(), params.gtasa_dir.as_str()).unwrap();
        return HttpResponse::Ok().body("{}");
    }

    let response = format!(
        "Received RPC request: {} with params: {:?}",
        path.method, payload.params
    );
    HttpResponse::Ok().body(response)
}

pub async fn initialize_rpc() -> Result<(), std::io::Error> {
    HttpServer::new(|| {
        App::new()
            .wrap(Cors::permissive())
            .service(web::resource("/rpc/{method}").route(web::post().to(rpc_handler)))
    })
    .bind("127.0.0.1:46290")?
    .run()
    .await
    // Ok(())
}
