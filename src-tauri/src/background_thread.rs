// use std::sync::Mutex;
// use sysinfo::System;

// static CHECK_NEW_INSTANCE_AND_CLOSE: Mutex<bool> = Mutex::new(false);

pub fn check_for_new_instance_and_close() {
    // let mut var = CHECK_NEW_INSTANCE_AND_CLOSE.lock().unwrap();
    // *var = true;
}

pub fn initialize_background_thread() {
    // std::thread::spawn(move || loop {
    //     let mut new_instance_check = CHECK_NEW_INSTANCE_AND_CLOSE.lock().unwrap();
    //     if *new_instance_check {
    //         let timeout_since_start = std::time::Duration::from_secs(10);
    //         let now: std::time::Instant = std::time::Instant::now();
    //         let elapsed = now.elapsed();
    //         if elapsed > timeout_since_start {
    //             *new_instance_check = false;
    //         }

    //         let s = System::new_all();

    //         let current_process = s.process(sysinfo::get_current_pid().unwrap()).unwrap();
    //         for process in s.processes_by_exact_name("omp-launcher.exe") {
    //             if process.pid() != current_process.pid() {
    //                 let new_uptime = process.run_time();
    //                 let current_uptime = current_process.run_time();
    //                 if new_uptime < current_uptime {
    //                     current_process.kill();
    //                     *new_instance_check = false;
    //                 }
    //             }
    //         }
    //     }

    //     std::thread::sleep(std::time::Duration::from_millis(500));
    // });
}
