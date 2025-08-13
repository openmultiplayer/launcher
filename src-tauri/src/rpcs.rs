use actix_cors::Cors;
use actix_web::{web, App, HttpResponse, HttpServer, Responder};
use md5::compute;
use serde::Deserialize;
use serde_json::json;
use sevenz_rust::decompress_file;
use std::error::Error;
use std::fs::File;
use std::io::Read;

use crate::{constants::*, errors::*, helpers};

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

fn get_checksum_of_files(list: Vec<String>) -> Result<Vec<String>> {
    let mut result = Vec::new();

    for file in list {
        let mut f = File::open(&file).map_err(|e| LauncherError::Io(e))?;

        let mut contents = Vec::new();
        f.read_to_end(&mut contents)
            .map_err(|e| LauncherError::Io(e))?;

        let digest = compute(&contents);
        let checksum_entry = format!("{}|{:x}", file, digest);
        result.push(checksum_entry);
    }

    Ok(result)
}

fn extract_7z(path: &str, output_path: &str) -> Result<()> {
    decompress_file(path, output_path).map_err(|e| {
        LauncherError::InternalError(format!("Failed to extract archive '{}': {}", path, e))
    })
}

fn copy_files_to_gtasa(src: &str, gtasa_dir: &str) -> std::result::Result<(), String> {
    match helpers::copy_files(src, gtasa_dir) {
        Ok(_) => Ok(()),
        Err(e) => {
            log::warn!("{}", e);
            match e {
                LauncherError::AccessDenied(_) => {
                    return Err("need_admin".to_string());
                }
                _ => return Err(e.to_string()),
            }
        }
    }
}

async fn rpc_handler(
    path: web::Path<RpcMethod>,
    payload: web::Json<RpcParams>,
) -> std::result::Result<impl Responder, Box<dyn Error>> {
    let params_str = serde_json::to_string(&payload.params)?;
    /*
     method: get_checksum_of_files
    */
    if path.method == "get_checksum_of_files" {
        let params: GetChecksumOfFilesParams = serde_json::from_str(params_str.as_str())?;
        let result = get_checksum_of_files(params.list)
            .map_err(|e| Box::new(std::io::Error::new(std::io::ErrorKind::Other, e)))?;
        return Ok(HttpResponse::Ok().body(serde_json::to_string(&json!(result))?));
    }
    /*
     method: extract_7z
    */
    else if path.method == "extract_7z" {
        let params: Extract7zParams = serde_json::from_str(params_str.as_str())?;
        extract_7z(&params.path, &params.output_path)
            .map_err(|e| Box::new(std::io::Error::new(std::io::ErrorKind::Other, e)))?;
        return Ok(HttpResponse::Ok().body("{}"));
    }
    /*
     method: copy_files_to_gtasa
    */
    else if path.method == "copy_files_to_gtasa" {
        let params: CopyFilesToGtaSaParams = serde_json::from_str(params_str.as_str())?;
        match copy_files_to_gtasa(&params.src, &params.gtasa_dir) {
            Ok(_) => return Ok(HttpResponse::Ok().body("{}")),
            Err(e) => return Ok(HttpResponse::Ok().body(e.to_string())),
        }
    }

    let response = format!(
        "Received RPC request: {} with params: {:?}",
        path.method, payload.params
    );
    Ok(HttpResponse::Ok().body(response))
}

pub async fn initialize_rpc() -> Result<()> {
    HttpServer::new(|| {
        App::new()
            .wrap(Cors::permissive())
            .service(web::resource("/rpc/{method}").route(web::post().to(rpc_handler)))
    })
    .bind(format!("127.0.0.1:{}", RPC_PORT))
    .map_err(|e| LauncherError::from(e))?
    .run()
    .await
    .map_err(|e| LauncherError::from(e))
}
