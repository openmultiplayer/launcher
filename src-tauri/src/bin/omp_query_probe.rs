fn main() {
    eprintln!("Usage: omp_query_probe <family> <host> <port> [opcode]");
    eprintln!("  family: ipv4 | ipv6");
    eprintln!("  opcode: i | o | c | r | p");
    std::process::exit(1);
}
