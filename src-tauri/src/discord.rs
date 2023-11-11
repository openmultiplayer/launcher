use crate::query;
use discord_rich_presence::{
    activity::{self, Timestamps},
    DiscordIpc, DiscordIpcClient,
};
use std::time::{SystemTime, UNIX_EPOCH};
use sysinfo::{ProcessExt, System, SystemExt};
use tauri::async_runtime::block_on;

pub fn initialize_drpc() -> () {
    std::thread::spawn(move || {
        let mut connected = false;
        let mut client = DiscordIpcClient::new("1057922416166305852").unwrap();
        match client.connect() {
            Ok(_) => {
                connected = true;
            }
            Err(_) => {
                connected = false;
            }
        };

        let timestamp: Timestamps = Timestamps::new();
        let mut start_time: u64 = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_secs();

        let mut hostname = "Unknown".to_string();
        let mut players = "0/0".to_string();
        let mut name: String = "Unknown".to_string();
        let mut ip: String = "Unknown".to_string();
        let mut port: String = "Unknown".to_string();

        let mut in_game = false;

        loop {
            if !connected {
                match client.reconnect() {
                    Ok(_) => {
                        connected = true;
                    }
                    Err(_) => {
                        connected = false;
                    }
                };

                std::thread::sleep(std::time::Duration::from_millis(1000));
                continue;
            }
            let s = System::new_all();
            let mut process_exists = false;

            for process in s.processes_by_exact_name("gta_sa.exe") {
                process_exists = true;

                let args = process.cmd();
                for n in 1..args.len() {
                    if args[n] == "-n" {
                        name = args[n + 1].to_string();
                    }

                    if args[n] == "-h" {
                        ip = args[n + 1].to_string();
                    }

                    if args[n] == "-p" {
                        port = args[n + 1].to_string();
                    }
                }

                let queryserver = query::Query::new(ip.as_str(), port.parse::<i32>().unwrap());
                match block_on(queryserver) {
                    Ok(q) => {
                        let _ = block_on(q.send('i'));
                        match block_on(q.recv()) {
                            Ok(p) => {
                                let server_info: query::InfoPacket =
                                    serde_json::from_str(p.as_str()).unwrap();
                                hostname = server_info.hostname;
                                players =
                                    format!("{}/{}", server_info.players, server_info.max_players);
                            }
                            Err(_e) => {
                                // println!("{}", e.to_string());
                                hostname = "".to_string();
                            }
                        }
                    }
                    Err(_e) => {
                        // println!("{}", e.to_string());
                        hostname = "".to_string();
                    }
                };
            }

            if process_exists {
                if !in_game {
                    in_game = true;
                    start_time = SystemTime::now()
                        .duration_since(UNIX_EPOCH)
                        .unwrap()
                        .as_secs();
                }
                let nick_name_detail = format!("Playing as {}", name);
                let full_server_address = format!("{}:{}", ip, port);
                hostname = if hostname.len() > 0 {
                    hostname
                } else {
                    "Unable to get server name".to_string()
                };

                let activity = activity::Activity::new()
                    .state(full_server_address.as_str())
                    .details(hostname.as_str())
                    .assets(
                        activity::Assets::new()
                            .large_image("logo")
                            .large_text(nick_name_detail.as_str())
                            .small_image("players")
                            .small_text(players.as_str()),
                    )
                    .timestamps(timestamp.clone().start(start_time.try_into().unwrap()));
                client.set_activity(activity).unwrap();
            } else {
                if in_game {
                    in_game = false;
                    start_time = SystemTime::now()
                        .duration_since(UNIX_EPOCH)
                        .unwrap()
                        .as_secs();
                }
                let activity = activity::Activity::new()
                    .details("In Launcher")
                    .assets(
                        activity::Assets::new()
                            .large_image("logo")
                            .large_text("Idle"),
                    )
                    .timestamps(timestamp.clone().start(start_time.try_into().unwrap()));
                client.set_activity(activity).unwrap();
            }

            std::thread::sleep(std::time::Duration::from_millis(1000));
        }
    });
}
