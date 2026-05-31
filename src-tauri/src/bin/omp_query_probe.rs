use std::env;
use std::net::{IpAddr, SocketAddr, ToSocketAddrs, UdpSocket};
use std::time::Duration;

const SAMP_HEADER: &[u8] = b"SAMP";
const SAMP6_HEADER: &[u8] = b"SAMP6";

fn print_usage() {
    eprintln!("Usage: omp_query_probe <family> <host> <port> [opcode]");
    eprintln!("  family: ipv4 | ipv6");
    eprintln!("  opcode: i | o | c | r | p");
}

fn parse_family(input: &str) -> Option<bool> {
    match input {
        "ipv4" => Some(false),
        "ipv6" => Some(true),
        _ => None,
    }
}

fn resolve_target(host: &str, port: u16, want_ipv6: bool) -> Result<SocketAddr, String> {
    if let Ok(ip) = host
        .trim_start_matches('[')
        .trim_end_matches(']')
        .parse::<IpAddr>()
    {
        return Ok(SocketAddr::new(ip, port));
    }

    let mut addrs = (host, port)
        .to_socket_addrs()
        .map_err(|e| format!("failed to resolve {host}:{port}: {e}"))?;

    addrs
        .find(|addr| addr.is_ipv6() == want_ipv6)
        .ok_or_else(|| {
            format!(
                "no {} address found for {}",
                if want_ipv6 { "IPv6" } else { "IPv4" },
                host
            )
        })
}

fn build_packet(target: SocketAddr, opcode: u8) -> Vec<u8> {
    let mut packet = Vec::new();
    match target.ip() {
        IpAddr::V4(ip) => {
            packet.extend_from_slice(SAMP_HEADER);
            packet.extend_from_slice(&ip.octets());
        }
        IpAddr::V6(ip) => {
            packet.extend_from_slice(SAMP6_HEADER);
            packet.extend_from_slice(&ip.octets());
        }
    }

    packet.push((target.port() & 0xFF) as u8);
    packet.push(((target.port() >> 8) & 0xFF) as u8);
    packet.push(opcode);

    if opcode == b'p' {
        packet.extend_from_slice(&[0, 0, 0, 0]);
    }

    packet
}

fn main() {
    let args: Vec<String> = env::args().collect();
    if args.len() < 4 || args.len() > 5 {
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
    let opcode = args
        .get(4)
        .and_then(|value| value.as_bytes().first().copied())
        .unwrap_or(b'i');

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

    let packet = build_packet(target, opcode);
    if let Err(e) = socket.send_to(&packet, target) {
        eprintln!("send_to failed: {e}");
        std::process::exit(1);
    }

    let mut response = [0_u8; 2048];
    let received = match socket.recv(&mut response) {
        Ok(n) => n,
        Err(e) => {
            eprintln!("recv failed: {e}");
            std::process::exit(1);
        }
    };

    println!("received {} bytes for opcode {}", received, opcode as char);
    if received >= 24 && &response[..5] == SAMP6_HEADER {
        println!("magic=SAMP6 opcode={}", response[23] as char);
    } else if received >= 11 && &response[..4] == SAMP_HEADER {
        println!("magic=SAMP opcode={}", response[10] as char);
    } else {
        println!("magic=unknown");
    }

    for (index, byte) in response[..received].iter().enumerate() {
        if index > 0 {
            print!(" ");
        }
        print!("{byte:02x}");
    }
    println!();
}
