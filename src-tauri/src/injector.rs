use dll_syringe::{process::OwnedProcess, Syringe};
use std::process::Command;

pub fn run_samp(
    name: &str,
    ip: &str,
    port: i32,
    executable_dir: &str,
    dll_path: &str,
) -> Result<(), String> {
    // Prepare the command to spawn the executable
    let mut cmd = Command::new(format!("{}/gta_sa.exe", executable_dir));

    let process = cmd
        .arg(format!("-c -n {} -h {} -p {}", name, ip, port))
        .current_dir(executable_dir)
        .spawn();

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
