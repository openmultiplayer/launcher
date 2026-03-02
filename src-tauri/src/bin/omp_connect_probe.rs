use std::env;
use std::net::{IpAddr, SocketAddr, ToSocketAddrs, UdpSocket};
use std::time::Duration;

const ID_OPEN_CONNECTION_REQUEST: u8 = 24;
const ID_OPEN_CONNECTION_REPLY: u8 = 25;
const ID_CONNECTION_ATTEMPT_FAILED: u8 = 29;
const ID_NO_FREE_INCOMING_CONNECTIONS: u8 = 31;

fn print_usage() {
    eprintln!("Usage: omp_connect_probe <family> <host> <port>");
    eprintln!("  family: ipv4 | ipv6");
}

fn parse_family(input: &str) -> Option<bool> {
    match input {
        "ipv4" => Some(false),
        "ipv6" => Some(true),
        _ => None,
    }
}

fn resolve_target(host: &str, port: u16, want_ipv6: bool) -> Result<SocketAddr, String> {
    if let Ok(ip) = host.trim_start_matches('[').trim_end_matches(']').parse::<IpAddr>() {
        return Ok(SocketAddr::new(ip, port));
    }

    let mut addrs = (host, port)
        .to_socket_addrs()
        .map_err(|e| format!("failed to resolve {host}:{port}: {e}"))?;

    addrs
        .find(|addr| addr.is_ipv6() == want_ipv6)
        .ok_or_else(|| format!("no {} address found for {}", if want_ipv6 { "IPv6" } else { "IPv4" }, host))
}

fn main() {
    let args: Vec<String> = env::args().collect();
    if args.len() != 4 {
        print_usage();
        std::process::exit(1);
    }

    let want_ipv6 = match parse_family(&args[1]) {
        Some(v) => v,
        None => {
            eprintln!("invalid family: {}", args[1]);
            std::process::exit(1);
        }
    };

    let host = &args[2];
    let port = match args[3].parse::<u16>() {
        Ok(v) => v,
        Err(e) => {
            eprintln!("invalid port {}: {}", args[3], e);
            std::process::exit(1);
        }
    };

    let target = match resolve_target(host, port, want_ipv6) {
        Ok(target) => target,
        Err(error) => {
            eprintln!("{error}");
            std::process::exit(1);
        }
    };

    let bind_addr = if want_ipv6 { "[::]:0" } else { "0.0.0.0:0" };
    let socket = match UdpSocket::bind(bind_addr) {
        Ok(socket) => socket,
        Err(e) => {
            eprintln!("bind failed on {bind_addr}: {e}");
            std::process::exit(1);
        }
    };
    socket.set_read_timeout(Some(Duration::from_secs(2))).ok();

    let request = [ID_OPEN_CONNECTION_REQUEST, 0, 0];
    if let Err(e) = socket.send_to(&request, target) {
        eprintln!("send_to failed: {e}");
        std::process::exit(1);
    }

    let mut response = [0_u8; 128];
    let received = match socket.recv(&mut response) {
        Ok(n) => n,
        Err(e) => {
            eprintln!("recv failed: {e}");
            std::process::exit(1);
        }
    };

    let packet_id = response[0];
    println!("received {} bytes", received);
    println!("packet_id={}", packet_id);

    match packet_id {
        ID_OPEN_CONNECTION_REPLY => {
            println!("result=open_connection_reply");
        }
        ID_CONNECTION_ATTEMPT_FAILED => {
            println!("result=connection_attempt_failed");
        }
        ID_NO_FREE_INCOMING_CONNECTIONS => {
            println!("result=no_free_incoming_connections");
        }
        _ => {
            println!("result=unexpected");
            std::process::exit(2);
        }
    }

    for (index, byte) in response[..received].iter().enumerate() {
        if index > 0 {
            print!(" ");
        }
        print!("{byte:02x}");
    }
    println!();
}
