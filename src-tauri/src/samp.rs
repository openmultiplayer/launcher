#[cfg(target_os = "windows")]
use crate::helpers;
#[cfg(target_os = "windows")]
use byteorder::{LittleEndian, ReadBytesExt};
use serde::{Deserialize, Serialize};
#[cfg(target_os = "windows")]
use std::fs::File;
#[cfg(target_os = "windows")]
use std::io::Cursor;
#[cfg(target_os = "windows")]
use std::io::Read;
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
    let key = RegKey::predef(HKEY_CURRENT_USER).open_subkey_with_flags(r"Software\SAMP", KEY_READ);
    match key {
        Ok(s) => {
            let result: Result<String, _> = s.get_value("gta_sa_exe");
            match result {
                Ok(val) => val.replace("\\gta_sa.exe", ""),
                Err(_) => "".to_string(),
            }
        }
        Err(_) => "".to_string(),
    }
}

#[cfg(target_os = "windows")]
pub fn get_nickname() -> String {
    let key = RegKey::predef(HKEY_CURRENT_USER).open_subkey_with_flags(r"Software\SAMP", KEY_READ);
    match key {
        Ok(s) => {
            let result = s.get_value("PlayerName");
            match result {
                Ok(val) => val,
                Err(_) => "".to_string(),
            }
        }
        Err(_) => "".to_string(),
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

    let documents_path = document_dir()
        .expect("unable to retrieve computer's documents path")
        .to_str()
        .expect("couldn't convert Documents path to &str")
        .to_string();

    let userdata_path = format!(
        "{}\\GTA San Andreas User Files\\SAMP\\USERDATA.DAT",
        documents_path
    );

    if Path::new(userdata_path.as_str()).exists() {
        let mut file = File::open(userdata_path).unwrap();

        let mut buffer = Vec::new();
        file.read_to_end(&mut buffer).unwrap();
        let mut r = Cursor::new(buffer.clone());

        // it's usually "SAMP"
        let mut file_id = [0; 4];
        r.read_exact(&mut file_id).unwrap();
        samp_user_data.file_id = String::from_utf8(file_id.to_vec()).unwrap();

        samp_user_data.file_version = r.read_u32::<LittleEndian>().unwrap();
        samp_user_data.server_count = r.read_u32::<LittleEndian>().unwrap();

        for _ in 0..samp_user_data.server_count {
            let mut server_info = SAMPServerInfo {
                ip: "".to_string(),
                port: 0,
                name: "".to_string(),
                password: "".to_string(),
                rcon: "".to_string(),
            };

            let ip_len = r.read_u32::<LittleEndian>().unwrap();
            let mut pos: u32 = r.position().try_into().unwrap();
            let server_ip = buffer[pos as usize..(pos + ip_len) as usize].to_vec();
            server_info.ip = helpers::decode_buffer(server_ip).0;
            r.set_position((pos + ip_len).try_into().unwrap());

            server_info.port = r.read_u32::<LittleEndian>().unwrap();

            let name_len = r.read_u32::<LittleEndian>().unwrap();
            pos = r.position().try_into().unwrap();
            let server_name = buffer[pos as usize..(pos + name_len) as usize].to_vec();
            server_info.name = helpers::decode_buffer(server_name).0;
            r.set_position((pos + name_len).try_into().unwrap());

            let password_len = r.read_u32::<LittleEndian>().unwrap();
            if password_len != 0 {
                pos = r.position().try_into().unwrap();
                let server_password = buffer[pos as usize..(pos + password_len) as usize].to_vec();
                server_info.password = helpers::decode_buffer(server_password).0;
                r.set_position((pos + password_len).try_into().unwrap());
            }

            let rcon_len = r.read_u32::<LittleEndian>().unwrap();
            if rcon_len != 0 {
                pos = r.position().try_into().unwrap();
                let server_rcon = buffer[pos as usize..(pos + rcon_len) as usize].to_vec();
                server_info.rcon = helpers::decode_buffer(server_rcon).0;
                r.set_position((pos + rcon_len).try_into().unwrap());
            }

            println!(
                "{} | + {}",
                serde_json::to_string(&server_info).unwrap(),
                r.position()
            );

            samp_user_data.favorite_servers.push(server_info);
        }
    }

    serde_json::to_string(&samp_user_data).unwrap()
}
