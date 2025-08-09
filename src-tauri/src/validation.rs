use crate::errors::*;
use std::path::Path;

pub fn validate_port(port: i32) -> Result<u16> {
    if !(1..=65535).contains(&port) {
        return Err(LauncherError::InvalidInput(
            format!("Port {} is out of valid range (1-65535)", port)
        ));
    }
    Ok(port as u16)
}

pub fn validate_hostname(hostname: &str) -> Result<String> {
    if hostname.trim().is_empty() {
        return Err(LauncherError::InvalidInput("Hostname cannot be empty".to_string()));
    }

    let trimmed = hostname.trim();
    
    // Basic length check
    if trimmed.len() > 253 {
        return Err(LauncherError::InvalidInput("Hostname too long".to_string()));
    }

    // Check for valid characters (basic validation)
    for c in trimmed.chars() {
        if !c.is_alphanumeric() && c != '.' && c != '-' && c != '_' {
            return Err(LauncherError::InvalidInput(
                format!("Invalid character in hostname: '{}'", c)
            ));
        }
    }

    Ok(trimmed.to_string())
}

pub fn validate_player_name(name: &str) -> Result<String> {
    if name.trim().is_empty() {
        return Err(LauncherError::InvalidInput("Player name cannot be empty".to_string()));
    }

    let trimmed = name.trim();
    
    if trimmed.len() > 24 {
        return Err(LauncherError::InvalidInput(
            "Player name cannot exceed 24 characters".to_string()
        ));
    }

    if trimmed.len() < 3 {
        return Err(LauncherError::InvalidInput(
            "Player name must be at least 3 characters".to_string()
        ));
    }

    // Check for valid characters (alphanumeric, underscore, brackets)
    for c in trimmed.chars() {
        if !c.is_alphanumeric() && c != '_' && c != '[' && c != ']' {
            return Err(LauncherError::InvalidInput(
                format!("Invalid character in player name: '{}'", c)
            ));
        }
    }

    Ok(trimmed.to_string())
}

pub fn validate_file_path(path: &str) -> Result<String> {
    if path.trim().is_empty() {
        return Err(LauncherError::InvalidInput("File path cannot be empty".to_string()));
    }

    let trimmed = path.trim();
    
    // Check for path traversal attempts
    if trimmed.contains("..") || trimmed.contains("//") {
        return Err(LauncherError::InvalidInput(
            "Path contains invalid sequences".to_string()
        ));
    }

    // Basic existence check
    if !Path::new(trimmed).exists() {
        return Err(LauncherError::NotFound(
            format!("Path does not exist: {}", trimmed)
        ));
    }

    Ok(trimmed.to_string())
}

pub fn sanitize_password(password: &str) -> String {
    // Remove null bytes and control characters
    password.chars()
        .filter(|&c| c != '\0' && !c.is_control())
        .collect::<String>()
        .trim()
        .to_string()
}
