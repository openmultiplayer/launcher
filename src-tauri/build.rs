fn main() {
    #[cfg(target_os = "windows")]
    {
        let mut res = winres::WindowsResource::new();
        res.set("FileDescription", "Open Multiplayer Launcher");
        res.set("ProductName", "open.mp Launcher");
        res.set("CompanyName", "open.mp");
        res.set("LegalCopyright", "Copyright (C) open.mp");
        res.set("InternalName", "omp-launcher.exe");
        res.set("OriginalFilename", "omp-launcher.exe");
        if let Err(e) = res.compile() {
            panic!("winres failed to compile Windows resources: {}", e);
        }
    }
    tauri_build::build()
}
