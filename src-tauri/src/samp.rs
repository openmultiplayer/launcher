#[cfg(target_os = "windows")]
use winreg::enums::*;
#[cfg(target_os = "windows")]
use winreg::RegKey;

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
