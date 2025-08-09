use std::fmt;

#[derive(Debug)]
pub enum LauncherError {
    Io(std::io::Error),
    SerdeJson(serde_json::Error),
    SystemTime(std::time::SystemTimeError),
    Parse(String),
    Network(String),
    Process(String),
    Injection(String),
    Registry(String),
    Storage(String),
    InvalidInput(String),
    NotFound(String),
    AccessDenied(String),
    InternalError(String),
}

impl fmt::Display for LauncherError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            LauncherError::Io(err) => write!(f, "IO error: {}", err),
            LauncherError::SerdeJson(err) => write!(f, "JSON error: {}", err),
            LauncherError::SystemTime(err) => write!(f, "System time error: {}", err),
            LauncherError::Parse(msg) => write!(f, "Parse error: {}", msg),
            LauncherError::Network(msg) => write!(f, "Network error: {}", msg),
            LauncherError::Process(msg) => write!(f, "Process error: {}", msg),
            LauncherError::Injection(msg) => write!(f, "Injection error: {}", msg),
            LauncherError::Registry(msg) => write!(f, "Registry error: {}", msg),
            LauncherError::Storage(msg) => write!(f, "Storage error: {}", msg),
            LauncherError::InvalidInput(msg) => write!(f, "Invalid input: {}", msg),
            LauncherError::NotFound(msg) => write!(f, "Not found: {}", msg),
            LauncherError::AccessDenied(msg) => write!(
                f,
                "Access denied - administrator privileges required: {}",
                msg
            ),
            LauncherError::InternalError(msg) => write!(f, "Internal error: {}", msg),
        }
    }
}

impl std::error::Error for LauncherError {}

impl From<std::io::Error> for LauncherError {
    fn from(err: std::io::Error) -> Self {
        match err.raw_os_error() {
            Some(5) => LauncherError::AccessDenied("Access denied".to_string()),
            Some(740) => LauncherError::AccessDenied("Admin privileges required".to_string()),
            _ => LauncherError::Io(err),
        }
    }
}

impl From<serde_json::Error> for LauncherError {
    fn from(err: serde_json::Error) -> Self {
        LauncherError::SerdeJson(err)
    }
}

impl From<std::time::SystemTimeError> for LauncherError {
    fn from(err: std::time::SystemTimeError) -> Self {
        LauncherError::SystemTime(err)
    }
}

impl From<String> for LauncherError {
    fn from(msg: String) -> Self {
        LauncherError::InternalError(msg)
    }
}

impl From<LauncherError> for String {
    fn from(err: LauncherError) -> Self {
        match err {
            LauncherError::AccessDenied(_) => "need_admin".to_string(),
            _ => err.to_string(),
        }
    }
}

pub type Result<T> = std::result::Result<T, LauncherError>;

impl From<LauncherError> for tauri::InvokeError {
    fn from(err: LauncherError) -> Self {
        tauri::InvokeError::from(err.to_string())
    }
}
