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

#[cfg(not(target_os = "windows"))]
use crate::{constants::*, errors::*};
#[cfg(not(target_os = "windows"))]
use log::info;
#[cfg(not(target_os = "windows"))]
use std::path::{Path, PathBuf};
#[cfg(not(target_os = "windows"))]
use std::process::{Command, Stdio};

// macOS/Linux: the game is a Windows binary inside a CrossOver/Wine bottle,
// so runtime DLL injection is not possible. The proxy load-vector DLL
// (version.dll / vorbisFile.dll) already in the game folder loads the
// client DLLs from disk, so we copy the chosen samp.dll / omp-client.dll
// next to the exe and then launch the game through CrossOver.
#[cfg(not(target_os = "windows"))]
pub async fn run_samp(
    name: &str,
    ip: &str,
    port: i32,
    executable_dir: &str,
    dll_path: &str,
    omp_file: &str,
    password: &str,
    custom_game_exe: &str,
) -> Result<()> {
    let game_dir = PathBuf::from(executable_dir);
    if !game_dir.is_dir() {
        return Err(LauncherError::NotFound(format!(
            "GTA SA directory not found: {}",
            executable_dir
        )));
    }

    // Resolve the executable: explicit override, else the Rockstar
    // re-release name, else the SA-MP 1.0 downgrade name.
    let exe_name = if !custom_game_exe.is_empty() {
        custom_game_exe.to_string()
    } else if game_dir.join(GTA_SA_EXECUTABLE_ALT).is_file() {
        GTA_SA_EXECUTABLE_ALT.to_string()
    } else {
        GTA_SA_EXECUTABLE.to_string()
    };
    let exe_path = game_dir.join(&exe_name);
    if !exe_path.is_file() {
        return Err(LauncherError::NotFound(format!(
            "Game executable not found: {}",
            exe_path.display()
        )));
    }

    // Place the chosen client DLLs next to the exe (best effort; the proxy
    // DLL needs them on disk before launch).
    let place = |src: &str, dst_name: &str| {
        if src.is_empty() {
            return;
        }
        let src_path = Path::new(src);
        if !src_path.is_file() {
            info!("[run_samp] skip copy, source missing: {}", src);
            return;
        }
        let dst = game_dir.join(dst_name);
        // The "custom" SA-MP version passes the in-folder DLL back as the
        // source. std::fs::copy(x, x) truncates the file to 0 bytes on
        // macOS, which then crashes the game. If src and dst are the same
        // file it is already in place: skip the copy.
        let same_file = match (std::fs::canonicalize(src_path), std::fs::canonicalize(&dst)) {
            (Ok(a), Ok(b)) => a == b,
            _ => false,
        };
        if same_file {
            info!("[run_samp] already in place, skip self-copy: {}", dst.display());
            return;
        }
        match std::fs::copy(src_path, &dst) {
            Ok(_) => info!("[run_samp] placed {} -> {}", src, dst.display()),
            Err(e) => info!("[run_samp] failed to place {}: {}", dst.display(), e),
        }
    };
    place(dll_path, SAMP_DLL);
    place(omp_file, OMP_CLIENT_DLL);

    // The Wine prefix is the bottle root: nearest ancestor with a drive_c.
    let prefix = {
        let mut cur = game_dir.as_path();
        let mut found: Option<PathBuf> = None;
        while let Some(parent) = cur.parent() {
            if parent.join("drive_c").is_dir() {
                found = Some(parent.to_path_buf());
                break;
            }
            cur = parent;
        }
        found
    };

    // SA-MP / open.mp connect arguments.
    let mut game_args: Vec<String> = vec![
        "-c".into(),
        "-n".into(),
        name.to_string(),
        "-h".into(),
        ip.to_string(),
        "-p".into(),
        port.to_string(),
    ];
    if !password.is_empty() {
        game_args.push("-z".into());
        game_args.push(password.to_string());
    }

    // Prefer CrossOver's cxstart (honours the bottle's Wine build + DXVK).
    let cxstart = Path::new(CROSSOVER_CXSTART);
    let wine_bin = [CROSSOVER_WINE_BIN, CROSSOVER_WINE_HOSTED]
        .iter()
        .map(Path::new)
        .find(|p| p.is_file());

    let spawn_result = if cxstart.is_file() {
        let pfx = prefix.ok_or_else(|| {
            LauncherError::NotFound(
                "Could not locate the Wine bottle (no drive_c ancestor)".to_string(),
            )
        })?;
        let bottle = pfx
            .file_name()
            .map(|s| s.to_string_lossy().to_string())
            .unwrap_or_default();
        let mut cmd = Command::new(cxstart);
        cmd.arg("--bottle")
            .arg(&bottle)
            .arg(&exe_path)
            .args(&game_args)
            .current_dir(&game_dir)
            .stdin(Stdio::null())
            .stdout(Stdio::null())
            .stderr(Stdio::null());
        info!(
            "[run_samp] cxstart bottle='{}' exe='{}'",
            bottle,
            exe_path.display()
        );
        cmd.spawn()
    } else if let Some(wine) = wine_bin {
        let pfx = prefix.ok_or_else(|| {
            LauncherError::NotFound(
                "Could not locate the Wine prefix (no drive_c ancestor)".to_string(),
            )
        })?;
        let mut cmd = Command::new(wine);
        cmd.env("WINEPREFIX", &pfx)
            .arg(&exe_path)
            .args(&game_args)
            .current_dir(&game_dir)
            .stdin(Stdio::null())
            .stdout(Stdio::null())
            .stderr(Stdio::null());
        info!(
            "[run_samp] wine='{}' prefix='{}' exe='{}'",
            wine.display(),
            pfx.display(),
            exe_path.display()
        );
        cmd.spawn()
    } else {
        return Err(LauncherError::NotFound(
            "CrossOver not found at /Applications/CrossOver.app. Install \
             CrossOver to run the game on macOS."
                .to_string(),
        ));
    };

    match spawn_result {
        Ok(_) => Ok(()),
        Err(e) => Err(LauncherError::Process(format!(
            "Failed to launch the game through Wine: {}",
            e
        ))),
    }
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

    let process = ready_for_exec.current_dir(executable_dir).spawn();

    match process {
        Ok(p) => {
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
                    let delay = std::time::Duration::from_millis(INJECTION_RETRY_DELAY_MS);
                    std::thread::sleep(delay);

                    if times >= INJECTION_MAX_RETRIES {
                        info!(
                            "[injector.rs] DLL {} injection failed after {} attempts: {}",
                            dll_path, INJECTION_MAX_RETRIES, e
                        );

                        if !waiting_for_vorbis {
                            return inject_dll(child, dll_path, 0, true);
                        }
                        return Err(LauncherError::Injection(format!(
                            "DLL injection failed: {}",
                            e
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
