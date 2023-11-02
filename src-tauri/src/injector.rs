#[cfg(target_os = "windows")]
use dll_syringe::{process::OwnedProcess, Syringe};
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
                    println!("{}", e.to_string());
                    "".to_string()
                }
            }
        }
    };

    let mut args = format!("-c -n {} -h {} -p {}", name, address, port);
    if password.len() > 0 {
        args = format!("-c -n {} -h {} -p {} -z {}", name, address, port, password);
    }

    let process = cmd.arg(args).current_dir(executable_dir).spawn();

    if process.is_ok() {
        let target_process = OwnedProcess::from_pid(process.unwrap().id()).unwrap();

        // create a new syringe for the target process
        let syringe = Syringe::for_process(target_process);

        // inject the payload into the target process
        let module = syringe.inject(dll_path);
        if module.is_ok() {
            return Ok(());
        } else {
            return Err("injecting dll failed".to_owned());
        }
    } else {
        return Err("spawning process failed".to_owned());
    }
}
