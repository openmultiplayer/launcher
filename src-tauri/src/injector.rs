#[cfg(target_os = "windows")]
use dll_syringe::{process::OwnedProcess, Syringe};
#[cfg(target_os = "windows")]
use log::info;
#[cfg(target_os = "windows")]
use std::path::PathBuf;
#[cfg(target_os = "windows")]
use std::process::{Command, Stdio};

#[cfg(target_os = "windows")]
use crate::{constants::*, errors::*};

#[cfg(target_os = "windows")]
fn inject_optional_dll(child: u32, dll_path: &str) -> Result<()> {
    inject_dll(child, dll_path, INJECTION_MAX_RETRIES, true)
}

#[cfg(target_os = "windows")]
fn format_injection_error_message(error: &impl std::fmt::Display) -> String {
    let raw = error.to_string();
    if raw.contains("os error 126") || raw.contains("The specified module could not be found") {
        format!(
            "{} (the target process could not load the DLL or one of its dependencies)",
            raw
        )
    } else {
        raw
    }
}

#[cfg(not(target_os = "windows"))]
pub async fn run_samp(
    _name: &str,
    _ip: &str,
    _port: i32,
    _executable_dir: &str,
    _dll_path: &str,
    _trace_file: &str,
    _trace_dualstack: bool,
    _trace_remote_ip: &str,
    _trace_remote_port: i32,
    _omp_file: &str,
    _password: &str,
    _custom_game_exe: &str,
) -> Result<()> {
    Ok(())
}

#[cfg(target_os = "windows")]
pub async fn run_samp(
    name: &str,
    ip: &str,
    port: i32,
    executable_dir: &str,
    dll_path: &str,
    trace_file: &str,
    trace_dualstack: bool,
    trace_remote_ip: &str,
    trace_remote_port: i32,
    omp_file: &str,
    password: &str,
    custom_game_exe: &str,
) -> Result<()> {
    // Prepare the command to spawn the executable
    let target_game_exe = if custom_game_exe.len() > 0 {
        custom_game_exe.to_string()
    } else {
        GTA_SA_EXECUTABLE.to_string()
    };

    let exe_path = PathBuf::from(executable_dir).join(&target_game_exe);

    let exe_path = exe_path.canonicalize().map_err(|e| {
        LauncherError::Process(format!("Invalid executable path {:?}: {}", exe_path, e))
    })?;

    let mut cmd = Command::new(&exe_path);

    let mut ready_for_exec = cmd
        .stdin(Stdio::null())
        .stdout(Stdio::null())
        .stderr(Stdio::null())
        .current_dir(executable_dir)
        .arg("-c")
        .arg("-n")
        .arg(name)
        .arg("-h")
        .arg(ip)
        .arg("-p")
        .arg(format!("{}", port));

    if !password.is_empty() {
        ready_for_exec = ready_for_exec.arg("-z").arg(password);
    }

    if !trace_file.is_empty() {
        ready_for_exec = ready_for_exec.env(
            "OMP_TRACE_DUALSTACK",
            if trace_dualstack { "1" } else { "0" },
        );

        if trace_dualstack
            && !trace_remote_ip.is_empty()
            && (1..=65535).contains(&trace_remote_port)
        {
            ready_for_exec = ready_for_exec
                .env("OMP_TRACE_REMOTE_IPV6", trace_remote_ip)
                .env("OMP_TRACE_REMOTE_PORT", trace_remote_port.to_string());
        }
    }

    let process = ready_for_exec.current_dir(executable_dir).spawn();

    match process {
        Ok(p) => {
            if !trace_file.is_empty() {
                if let Err(e) = inject_optional_dll(p.id(), trace_file) {
                    let error_text = format_injection_error_message(&e);
                    info!(
                        "[run_samp] optional trace DLL injection failed for {}: {}",
                        trace_file, error_text
                    );
                }
            }
            inject_dll(p.id(), dll_path, 0, false)?;
            info!("[run_samp] omp_file.is_empty(): {}", omp_file.is_empty());
            if !omp_file.is_empty() {
                inject_dll(p.id(), omp_file, 0, false)
            } else {
                Ok(())
            }
        }
        Err(e) => {
            info!("[injector.rs] Process creation failed: {}", e);

            match e.raw_os_error() {
                Some(ERROR_ELEVATION_REQUIRED) => Err(LauncherError::AccessDenied(
                    "Unable to open game process".to_string(),
                )),
                Some(ERROR_ACCESS_DENIED) => Err(LauncherError::AccessDenied(
                    "Unable to open game process".to_string(),
                )),
                _ => Err(LauncherError::Process(format!(
                    "Failed to spawn process: {}",
                    e
                ))),
            }
        }
    }
}

#[cfg(target_os = "windows")]
pub fn inject_dll(child: u32, dll_path: &str, times: u32, waiting_for_vorbis: bool) -> Result<()> {
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
                    let mut module_handles: [HMODULE; PROCESS_MODULE_BUFFER_SIZE] =
                        [0 as *mut _; PROCESS_MODULE_BUFFER_SIZE];
                    let mut found = 0;

                    EnumProcessModulesEx(
                        handle,
                        module_handles.as_mut_ptr(),
                        module_handles.len() as _,
                        &mut found,
                        0x03,
                    );

                    let mut bytes = [0i8; PROCESS_MODULE_BUFFER_SIZE];

                    if found == 0 {
                        let delay = std::time::Duration::from_millis(INJECTION_RETRY_DELAY_MS);
                        std::thread::sleep(delay);
                        return inject_dll(child, dll_path, times, true);
                    }

                    let mut found_vorbis = false;
                    for i in 0..(found / 4) {
                        if GetModuleFileNameExA(
                            handle,
                            module_handles[i as usize],
                            bytes.as_mut_ptr(),
                            PROCESS_MODULE_BUFFER_SIZE as u32,
                        ) != 0
                        {
                            let string = std::ffi::CStr::from_ptr(bytes.as_ptr());
                            if string.to_string_lossy().to_string().contains("vorbis") {
                                found_vorbis = true;
                            }
                        }
                    }

                    if !found_vorbis {
                        let delay = std::time::Duration::from_millis(INJECTION_RETRY_DELAY_MS);
                        std::thread::sleep(delay);
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
                    let error_text = format_injection_error_message(&e);
                    let delay = std::time::Duration::from_millis(INJECTION_RETRY_DELAY_MS);
                    std::thread::sleep(delay);

                    if times >= INJECTION_MAX_RETRIES {
                        info!(
                            "[injector.rs] DLL {} injection failed after {} attempts: {}",
                            dll_path, INJECTION_MAX_RETRIES, error_text
                        );

                        if !waiting_for_vorbis {
                            return inject_dll(child, dll_path, 0, true);
                        }
                        return Err(LauncherError::Injection(format!(
                            "DLL injection failed: {}",
                            error_text
                        )));
                    }

                    inject_dll(child, dll_path, times + 1, waiting_for_vorbis)
                }
            }
        }
        Err(e) => {
            info!("[injector.rs] Failed to access process: {}", e);

            match e.raw_os_error() {
                Some(ERROR_ELEVATION_REQUIRED) => Err(LauncherError::AccessDenied(
                    "Unable to open game process".to_string(),
                )),
                Some(ERROR_ACCESS_DENIED) => Err(LauncherError::AccessDenied(
                    "Unable to open game process".to_string(),
                )),
                _ => Err(LauncherError::Process(format!(
                    "Failed to access process: {}",
                    e
                ))),
            }
        }
    }
}
