use crate::helpers;
use byteorder::ReadBytesExt;
use serde::{Deserialize, Serialize};
use std::fs::File;
use std::io::Cursor;
use std::io::Read;
use tauri::api::path::document_dir;
#[cfg(target_os = "windows")]
use winreg::enums::*;
#[cfg(target_os = "windows")]
use winreg::RegKey;

#[derive(Serialize, Deserialize)]
pub struct SAMPServerInfo {
    pub ip_len: u32,
    pub ip: String,
    pub port: u32,
    pub name_len: u32,
    pub name: String,
}

#[derive(Serialize, Deserialize)]
pub struct SAMPUserData {
    pub file_id: String,
    pub file_version: u32,
    pub server_count: u32,
    pub favorite_servers: Vec<SAMPServerInfo>,
}

#[cfg(not(target_os = "windows"))]
pub fn get_gtasa_path() -> Option<String> {
    Some("")
}

#[cfg(not(target_os = "windows"))]
pub fn get_player_name() -> Option<String> {
    Some("")
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
    use byteorder::LittleEndian;

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

    println!(
        "{}\\GTA San Andreas User Files\\SAMP\\USERDATA.DAT",
        documents_path
    );

    let userdata_path = format!(
        "{}\\GTA San Andreas User Files\\SAMP\\USERDATA.DAT",
        documents_path
    );
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

    // println!(
    //     "file id: {}\nversion: {}\nserver count: {}",
    //     samp_user_data.file_id, samp_user_data.file_version, samp_user_data.server_count
    // );

    for _ in 0..samp_user_data.server_count {
        let mut server_info = SAMPServerInfo {
            ip_len: 0,
            ip: "".to_string(),
            port: 0,
            name_len: 0,
            name: "".to_string(),
        };

        server_info.ip_len = r.read_u32::<LittleEndian>().unwrap();
        let mut pos: u32 = r.position().try_into().unwrap();
        let server_ip = buffer[pos as usize..(pos + server_info.ip_len) as usize].to_vec();
        server_info.ip = helpers::decode_buffer(server_ip);
        r.set_position((pos + server_info.ip_len).try_into().unwrap());

        server_info.port = r.read_u32::<LittleEndian>().unwrap();
        server_info.name_len = r.read_u32::<LittleEndian>().unwrap();

        pos = r.position().try_into().unwrap();
        let server_name = buffer[pos as usize..(pos + server_info.name_len) as usize].to_vec();
        server_info.name = helpers::decode_buffer(server_name);

        // This `+ 8` is due to some stupid 8 bytes padding who knows why or what for (always 0)
        r.set_position((pos + server_info.name_len + 8).try_into().unwrap());

        samp_user_data.favorite_servers.push(server_info);
    }

    serde_json::to_string(&samp_user_data).unwrap()
}

// 4 + 14 + 4 + 4 + 33 + 4
