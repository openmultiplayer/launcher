#[cfg(target_os = "windows")]
use dll_syringe::{process::OwnedProcess, Syringe};
use log::info;
use regex::Regex;
use std::process::Command;
use tokio::net::lookup_host;

#[cfg(not(target_os = "windows"))]
pub fn run_samp(
    name: &str,
    ip: &str,
    port: i32,
    executable_dir: &str,
    dll_path: &str,
    password: &str,
) -> Result<(), String> {
    ""
}

#[cfg(target_os = "windows")]
pub async fn run_samp(
    name: &str,
    ip: &str,
    port: i32,
    executable_dir: &str,
    dll_path: &str,
    password: &str,
) -> Result<(), String> {
    // Prepare the command to spawn the executable
    let mut cmd = Command::new(format!("{}/gta_sa.exe", executable_dir));

    let regex = Regex::new(r"^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$").unwrap();
    let address = match regex.captures(ip) {
        Some(_) => {
            // it's valid ipv4, move on
            ip.to_string()
        }
        None => {
            info!(
                "[injector.rs] Address {} is not IPv4, trying to perform host lookup.",
                ip
            );
            let socket_addresses = lookup_host(format!("{}:{}", ip, port)).await;
            match socket_addresses {
                Ok(s) => {
                    let mut ipv4 = "".to_string();
                    for socket_address in s {
                        if socket_address.is_ipv4() {
                            // hostname is resolved to ipv4:port, lets split it by ":" and get ipv4 only
                            let ip_port = socket_address.to_string();
                            let vec: Vec<&str> = ip_port.split(':').collect();
                            ipv4 = vec[0].to_string();
                        }
                    }
                    ipv4
                }
                Err(e) => {
                    info!(
                        "[injector.rs] Host lookup for {} failed: {}",
                        ip,
                        e.to_string()
                    );
                    "".to_string()
                }
            }
        }
    };

    let mut ready_for_exec = cmd
        .arg("-c")
        .arg("-n")
        .arg(name)
        .arg("-h")
        .arg(address)
        .arg("-p")
        .arg(format!("{}", port));

    if password.len() > 0 {
        ready_for_exec = ready_for_exec.arg("-z").arg(password);
    }

    let process = ready_for_exec.current_dir(executable_dir).spawn();

    match process {
        Ok(p) => {
            // let target_process = .unwrap();
            match OwnedProcess::from_pid(p.id()) {
                Ok(p) => {
                    // create a new syringe for the target process
                    let syringe = Syringe::for_process(p);

                    // inject the payload into the target process
                    match syringe.inject(dll_path) {
                        Ok(_) => Ok(()),
                        Err(e) => {
                            info!("[injector.rs] Dll injection failed: {}", e.to_string());
                            Err(format!("Injecting dll failed: {}", e.to_string()).to_owned())
                        }
                    }
                }
                Err(e) => {
                    info!("[injector.rs] Process creation failed: {}", e.to_string());
                    Err(format!("Finding GTASA process failed: {}", e.to_string()).to_owned())
                }
            }
        }
        Err(e) => {
            info!("[injector.rs] Process creation failed: {}", e.to_string());

            let mut raw_os_err = 0;
            if e.raw_os_error().is_some() {
                raw_os_err = e.raw_os_error().get_or_insert(0).to_owned();
            }

            if raw_os_err == 740 {
                return Err("need_admin".to_string());
            }

            return Err(format!("Spawning process failed (error code: {})", raw_os_err).to_owned());
        }
    }
}
