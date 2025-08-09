#[cfg(target_os = "windows")]
use crate::{constants::*, helpers};
#[cfg(target_os = "windows")]
use byteorder::{LittleEndian, ReadBytesExt};
use serde::{Deserialize, Serialize};
#[cfg(target_os = "windows")]
use std::fs::File;
#[cfg(target_os = "windows")]
use std::io::{Cursor, Read};
#[cfg(target_os = "windows")]
use std::path::Path;
#[cfg(target_os = "windows")]
use tauri::api::path::document_dir;
#[cfg(target_os = "windows")]
use winreg::enums::*;
#[cfg(target_os = "windows")]
use winreg::RegKey;

#[derive(Serialize, Deserialize)]
pub struct SAMPServerInfo {
    pub ip: String,
    pub port: u32,
    pub name: String,
    pub password: String,
    pub rcon: String,
}

#[derive(Serialize, Deserialize)]
pub struct SAMPUserData {
    pub file_id: String,
    pub file_version: u32,
    pub server_count: u32,
    pub favorite_servers: Vec<SAMPServerInfo>,
}

#[cfg(not(target_os = "windows"))]
pub fn get_gtasa_path() -> String {
    "".to_string()
}

#[cfg(not(target_os = "windows"))]
pub fn get_nickname() -> String {
    "".to_string()
}

#[cfg(not(target_os = "windows"))]
pub fn get_samp_favorite_list() -> String {
    "[]".to_string()
}

#[cfg(target_os = "windows")]
pub fn get_gtasa_path() -> String {
    let key_result = RegKey::predef(HKEY_CURRENT_USER)
        .open_subkey_with_flags(SAMP_REGISTRY_KEY, KEY_READ);
    
    match key_result {
        Ok(key) => {
            match key.get_value::<String, _>("gta_sa_exe") {
                Ok(path) => path.replace(&format!("\\{}", GTA_SA_EXECUTABLE), ""),
                Err(_) => String::new(),
            }
        }
        Err(_) => String::new(),
    }
}

#[cfg(target_os = "windows")]
pub fn get_nickname() -> String {
    let key_result = RegKey::predef(HKEY_CURRENT_USER)
        .open_subkey_with_flags(SAMP_REGISTRY_KEY, KEY_READ);
    
    match key_result {
        Ok(key) => {
            key.get_value::<String, _>("PlayerName")
                .unwrap_or_default()
        }
        Err(_) => String::new(),
    }
}

#[cfg(target_os = "windows")]
pub fn get_samp_favorite_list() -> String {
    let mut samp_user_data: SAMPUserData = SAMPUserData {
        file_id: "none".to_string(),
        file_version: 0,
        server_count: 0,
        favorite_servers: Vec::<SAMPServerInfo>::from([]),
    };

    let documents_path = match document_dir() {
        Some(path) => match path.to_str() {
            Some(path_str) => path_str.to_string(),
            None => return serde_json::to_string(&samp_user_data).unwrap_or_default(),
        },
        None => return serde_json::to_string(&samp_user_data).unwrap_or_default(),
    };

    let userdata_path = format!("{}{}", documents_path, SAMP_USERDATA_PATH);

    if Path::new(&userdata_path).exists() {
        let mut file = match File::open(&userdata_path) {
            Ok(f) => f,
            Err(_) => return serde_json::to_string(&samp_user_data).unwrap_or_default(),
        };

        let mut buffer = Vec::new();
        if file.read_to_end(&mut buffer).is_err() {
            return serde_json::to_string(&samp_user_data).unwrap_or_default();
        }
        let mut r = Cursor::new(buffer.clone());

        // Read file header - it's usually "SAMP"
        let mut file_id = [0; 4];
        if r.read_exact(&mut file_id).is_err() {
            return serde_json::to_string(&samp_user_data).unwrap_or_default();
        }
        samp_user_data.file_id = String::from_utf8_lossy(&file_id).to_string();

        samp_user_data.file_version = match r.read_u32::<LittleEndian>() {
            Ok(version) => version,
            Err(_) => return serde_json::to_string(&samp_user_data).unwrap_or_default(),
        };
        samp_user_data.server_count = match r.read_u32::<LittleEndian>() {
            Ok(count) => count,
            Err(_) => return serde_json::to_string(&samp_user_data).unwrap_or_default(),
        };

        for _ in 0..samp_user_data.server_count {
            let mut server_info = SAMPServerInfo {
                ip: "".to_string(),
                port: 0,
                name: "".to_string(),
                password: "".to_string(),
                rcon: "".to_string(),
            };

            let ip_len = match r.read_u32::<LittleEndian>() {
                Ok(len) => len,
                Err(_) => break,
            };
            let pos = r.position() as usize;
            if pos + ip_len as usize > buffer.len() {
                break;
            }
            let server_ip = buffer[pos..pos + ip_len as usize].to_vec();
            server_info.ip = helpers::decode_buffer(server_ip).0;
            r.set_position((pos + ip_len as usize) as u64);

            server_info.port = match r.read_u32::<LittleEndian>() {
                Ok(port) => port,
                Err(_) => break,
            };

            let name_len = match r.read_u32::<LittleEndian>() {
                Ok(len) => len,
                Err(_) => break,
            };
            let pos = r.position() as usize;
            if pos + name_len as usize > buffer.len() {
                break;
            }
            let server_name = buffer[pos..pos + name_len as usize].to_vec();
            server_info.name = helpers::decode_buffer(server_name).0;
            r.set_position((pos + name_len as usize) as u64);

            let password_len = match r.read_u32::<LittleEndian>() {
                Ok(len) => len,
                Err(_) => break,
            };
            if password_len != 0 {
                let pos = r.position() as usize;
                if pos + password_len as usize > buffer.len() {
                    break;
                }
                let server_password = buffer[pos..pos + password_len as usize].to_vec();
                server_info.password = helpers::decode_buffer(server_password).0;
                r.set_position((pos + password_len as usize) as u64);
            }

            let rcon_len = match r.read_u32::<LittleEndian>() {
                Ok(len) => len,
                Err(_) => break,
            };
            if rcon_len != 0 {
                let pos = r.position() as usize;
                if pos + rcon_len as usize > buffer.len() {
                    break;
                }
                let server_rcon = buffer[pos..pos + rcon_len as usize].to_vec();
                server_info.rcon = helpers::decode_buffer(server_rcon).0;
                r.set_position((pos + rcon_len as usize) as u64);
            }

            // Debug output removed for cleaner logging

            samp_user_data.favorite_servers.push(server_info);
        }
    }

    serde_json::to_string(&samp_user_data).unwrap_or_default()
}
