#[cfg(target_os = "windows")]
use dll_syringe::{process::OwnedProcess, Syringe};
use log::info;
use regex::Regex;
use std::process::Command;
use tokio::net::lookup_host;

#[cfg(not(target_os = "windows"))]
pub async fn run_samp(
    name: &str,
    ip: &str,
    port: i32,
    executable_dir: &str,
    dll_path: &str,
    omp_file: &str,
    password: &str,
    discord: bool,
) -> Result<(), String> {
    Ok(())
}

#[cfg(target_os = "windows")]
pub async fn run_samp(
    name: &str,
    ip: &str,
    port: i32,
    executable_dir: &str,
    dll_path: &str,
    omp_file: &str,
    password: &str,
    discord: bool,
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
                    " ".to_string()
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

    if !password.is_empty() {
        ready_for_exec = ready_for_exec.arg("-z").arg(password);
    }

    if discord {
        ready_for_exec = ready_for_exec.arg("--discord");
    }

    let process = ready_for_exec.current_dir(executable_dir).spawn();

    match process {
        Ok(p) => {
            // let target_process = .unwrap();
            match inject_dll(p.id(), dll_path, 0, false) {
                Ok(_) => inject_dll(p.id(), omp_file, 0, false),
                Err(e) => {
                    return Err(e);
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

            return Err(format!(
                "Spawning process failed (error code: {})",
                raw_os_err
            ));
        }
    }
}

#[cfg(target_os = "windows")]
pub fn inject_dll(
    child: u32,
    dll_path: &str,
    times: u32,
    waiting_for_vorbis: bool,
) -> Result<(), String> {
    use winapi::{
        shared::minwindef::{FALSE, HMODULE},
        um::{
            processthreadsapi::OpenProcess,
            psapi::{EnumProcessModulesEx, GetModuleFileNameExA},
            winnt::PROCESS_ALL_ACCESS,
        },
    };

    match OwnedProcess::from_pid(child) {
        Ok(p) => {
            if waiting_for_vorbis {
                unsafe {
                    let handle = OpenProcess(PROCESS_ALL_ACCESS, FALSE, child);
                    let mut module_handles: [HMODULE; 1024] = [0 as *mut _; 1024];
                    let mut found = 0;

                    EnumProcessModulesEx(
                        handle,
                        module_handles.as_mut_ptr(),
                        module_handles.len() as _,
                        &mut found,
                        0x03,
                    );

                    let mut bytes = [0i8; 1024];

                    if found == 0 {
                        let ten_millis = std::time::Duration::from_millis(500);
                        std::thread::sleep(ten_millis);
                        return inject_dll(child, dll_path, times, true);
                    }

                    let mut found_vorbis = false;
                    for i in 0..(found / 4) {
                        if GetModuleFileNameExA(
                            handle,
                            module_handles[i as usize],
                            bytes.as_mut_ptr(),
                            1024,
                        ) != 0
                        {
                            let string = std::ffi::CStr::from_ptr(bytes.as_ptr());
                            if string.to_string_lossy().to_string().contains("vorbis") {
                                found_vorbis = true;
                            }
                        }
                    }

                    if !found_vorbis {
                        let ten_millis = std::time::Duration::from_millis(500);
                        std::thread::sleep(ten_millis);
                        return inject_dll(child, dll_path, times, true);
                    }
                }
            }

            // create a new syringe for the target process
            let syringe = Syringe::for_process(p);

            // inject the payload into the target process
            match syringe.inject(dll_path) {
                Ok(_) => Ok(()),
                Err(e) => {
                    let ten_millis = std::time::Duration::from_millis(500);
                    std::thread::sleep(ten_millis);

                    if times == 5 {
                        info!(
                            "[injector.rs] Initial DLL {} injection failed: {}",
                            dll_path,
                            e.to_string()
                        );

                        if !waiting_for_vorbis {
                            return inject_dll(child, dll_path, 0, true);
                        }
                        Err(format!("Injecting dll failed: {}", e.to_string()))
                    } else {
                        if !waiting_for_vorbis {
                            inject_dll(child, dll_path, times + 1, false)
                        } else {
                            inject_dll(child, dll_path, times + 1, true)
                        }
                    }
                }
            }
        }
        Err(e) => {
            info!("[injector.rs] Process creation failed: {}", e.to_string());
            Err(format!("Finding GTASA process failed: {}", e.to_string()))
        }
    }
}
