use crate::{constants::*, errors::*, validation};
use gumdrop::Options;
use std::process::exit;

#[derive(Debug, Options)]
pub struct CliArgs {
    #[options(no_short, help = "print help message")]
    pub help: bool,

    #[options(help = "target server IP address")]
    pub host: Option<String>,

    #[options(help = "target server port")]
    pub port: Option<i32>,

    #[options(help = "target server password")]
    pub password: Option<String>,

    #[options(help = "nickname to join server with")]
    pub name: Option<String>,

    #[options(help = "game path to use for both game executable and samp.dll")]
    pub gamepath: Option<String>,

    #[options(help = "disable omp-client injection")]
    pub no_omp: bool,
}

impl CliArgs {
    pub fn validate(&self) -> Result<()> {
        if let Some(ref host) = self.host {
            validation::validate_hostname(host)?;
        }

        if let Some(port) = self.port {
            validation::validate_port(port)?;
        }

        if let Some(ref name) = self.name {
            validation::validate_player_name(name)?;
        }

        if let Some(ref gamepath) = self.gamepath {
            validation::validate_file_path(gamepath)?;

            let gta_exe = format!("{}/{}", gamepath, GTA_SA_EXECUTABLE);
            if !std::path::Path::new(&gta_exe).exists() {
                return Err(LauncherError::NotFound(format!(
                    "GTA San Andreas executable not found at: {}",
                    gta_exe
                )));
            }
        }

        Ok(())
    }

    pub fn print_help_and_exit(program_name: &str) -> ! {
        // Using println! here is appropriate for CLI help output
        println!(
            "Open Multiplayer Launcher

Usage: {} [OPTIONS]

Options:
      --help
  -h, --host <HOST>          Server IP
  -p, --port <PORT>          Server port
  -P, --password <PASSWORD>  Server password
  -n, --name <NAME>          Nickname
  -g, --gamepath <GAMEPATH>  Game path
      --no-omp               Disable omp-client injection
            ",
            program_name
        );
        exit(0)
    }

    pub fn has_game_launch_args(&self) -> bool {
        self.host.is_some() && self.name.is_some() && self.port.is_some() && self.gamepath.is_some()
    }

    pub fn get_password(&self) -> String {
        match &self.password {
            Some(pwd) => validation::sanitize_password(pwd),
            None => String::new(),
        }
    }
}
