use actix_cors::Cors;
use actix_web::{web, App, HttpResponse, HttpServer, Responder};
use md5::compute;
use serde::Deserialize;
use serde_json::json;
use sevenz_rust::decompress_file;
use std::error::Error;
use std::fs::File;
use std::io::Read;

use crate::helpers;
use crate::nativestorage;

#[derive(Deserialize)]
struct RpcParams {
    params: serde_json::Value,
}

#[derive(Deserialize)]
struct RpcMethod {
    method: String,
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

async fn rpc_handler(
    path: web::Path<RpcMethod>,
    payload: web::Json<RpcParams>,
) -> Result<impl Responder, Box<dyn Error>> {
    let params_str = serde_json::to_string(&payload.params)?;
    /*
     method: get_checksum_of_files
    */
    if path.method == "get_checksum_of_files" {
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

pub async fn initialize_rpc() -> Result<(), std::io::Error> {
    HttpServer::new(|| {
        App::new()
            .wrap(Cors::permissive())
            .service(
                web::resource("/sync_rpc/{method}")
                    .route(web::post().to(nativestorage::sync_storage_rpc_handler)),
            )
            .service(web::resource("/rpc/{method}").route(web::post().to(rpc_handler)))
    })
    .bind("127.0.0.1:46290")?
    .run()
    .await
}
