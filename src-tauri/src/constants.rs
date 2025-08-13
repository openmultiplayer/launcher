pub const IPC_PORT: u16 = 45791;
pub const RPC_PORT: u16 = 46290;

pub const MAX_HOSTNAME_LENGTH: u32 = 63;
pub const MAX_GAMEMODE_LENGTH: u32 = 39;
pub const MAX_LANGUAGE_LENGTH: u32 = 39;
pub const MAX_DISCORD_LINK_LENGTH: u32 = 50;
pub const MAX_BANNER_URL_LENGTH: u32 = 160;
pub const MAX_LOGO_URL_LENGTH: u32 = 160;

pub const MAX_PLAYER_COUNT: u16 = 1000;
pub const MAX_RULE_COUNT: u16 = 1000;

pub const QUERY_TIMEOUT_SECS: u64 = 2;
pub const OMP_EXTRA_INFO_UPDATE_COOLDOWN_SECS: u64 = 3;

pub const INJECTION_MAX_RETRIES: u32 = 5;
pub const INJECTION_RETRY_DELAY_MS: u64 = 500;

pub const UDP_BUFFER_SIZE: usize = 1500;
pub const PROCESS_MODULE_BUFFER_SIZE: usize = 1024;

pub const SAMP_PACKET_HEADER: &[u8] = b"SAMP";

pub const QUERY_TYPE_INFO: char = 'i';
pub const QUERY_TYPE_PLAYERS: char = 'c';
pub const QUERY_TYPE_RULES: char = 'r';
pub const QUERY_TYPE_EXTRA_INFO: char = 'o';
pub const QUERY_TYPE_PING: char = 'p';

pub const PING_TIMEOUT: u32 = 9999;

pub const LOG_FILE_NAME: &str = "omp-launcher.log";
pub const DATA_DIR_NAME: &str = "mp.open.launcher";

pub const GTA_SA_EXECUTABLE: &str = "gta_sa.exe";
pub const SAMP_DLL: &str = "samp.dll";
pub const OMP_CLIENT_DLL: &str = "omp-client.dll";

pub const DEEPLINK_SCHEME_OMP: &str = "omp";
pub const DEEPLINK_SCHEME_SAMP: &str = "samp";
pub const DEEPLINK_IDENTIFIER: &str = "mp.open.launcher";

pub const WINDOW_MIN_WIDTH: u32 = 1000;
pub const WINDOW_MIN_HEIGHT: u32 = 700;

#[cfg(target_os = "windows")]
pub const SAMP_REGISTRY_KEY: &str = r"Software\SAMP";

#[cfg(target_os = "windows")]
pub const SAMP_USERDATA_PATH: &str = r"\GTA San Andreas User Files\SAMP\USERDATA.DAT";

pub const ERROR_DIRECTORY_EXISTS: i32 = 183;
pub const ERROR_ACCESS_DENIED: i32 = 5;
pub const ERROR_ELEVATION_REQUIRED: i32 = 740;
