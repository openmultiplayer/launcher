use tauri::{Window, WindowEvent};
use windows_sys::Win32::Graphics::Gdi::{CreateRoundRectRgn, DeleteObject, SetWindowRgn};
use windows_sys::Win32::System::LibraryLoader::{GetModuleHandleW, GetProcAddress};
use windows_sys::Win32::UI::WindowsAndMessaging::{MessageBoxW, MB_ICONERROR, MB_OK};

// Matches the 10px border radius the frontend uses outside Wine.
const CORNER_RADIUS: f64 = 10.0;

pub fn is_wine() -> bool {
    let module_name = to_wide("ntdll.dll");
    let module = unsafe { GetModuleHandleW(module_name.as_ptr()) };
    if module == 0 {
        return false;
    }

    unsafe { GetProcAddress(module, b"wine_get_version\0".as_ptr()).is_some() }
}

// wry's default when no browser arguments are given.
const DEFAULT_BROWSER_ARGS: &str = "--disable-features=msWebOOUI,msPdfOOUI,msSmartScreenProtection";

// WebView2 ignores WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS once the app passes
// arguments, which wry always does, so under Wine they come from
// OMP_WEBVIEW2_ARGS instead. It defaults to software rendering, which paints
// input faster than WebView2's GPU path through Wine; set it empty to use
// the GPU.
pub fn browser_args() -> Option<String> {
    if !is_wine() {
        return None;
    }

    let extra = std::env::var("OMP_WEBVIEW2_ARGS").unwrap_or_else(|_| "--disable-gpu".to_string());
    let extra = extra.trim();
    if extra.is_empty() {
        return None;
    }

    Some(format!("{} {}", DEFAULT_BROWSER_ARGS, extra))
}

// Wine cannot show the transparent window's rounded corners, so the frontend
// drops them there and the window itself is cut to a rounded shape instead.
pub fn round_window_corners(window: &Window) {
    if !is_wine() {
        return;
    }

    apply_rounded_region(window);

    let window_clone = window.clone();
    window.on_window_event(move |event| {
        if matches!(
            event,
            WindowEvent::Resized(_) | WindowEvent::ScaleFactorChanged { .. }
        ) {
            apply_rounded_region(&window_clone);
        }
    });
}

fn apply_rounded_region(window: &Window) {
    let Ok(hwnd) = window.hwnd() else {
        return;
    };
    let Ok(size) = window.outer_size() else {
        return;
    };

    if window.is_maximized().unwrap_or(false) {
        unsafe {
            SetWindowRgn(hwnd.0, 0, 1);
        }
        return;
    }

    let scale = window.scale_factor().unwrap_or(1.0);
    let diameter = (CORNER_RADIUS * 2.0 * scale).round() as i32;
    let width = size.width as i32;
    let height = size.height as i32;

    unsafe {
        let region = CreateRoundRectRgn(0, 0, width + 1, height + 1, diameter, diameter);
        if region == 0 {
            return;
        }
        // On success the system owns the region.
        if SetWindowRgn(hwnd.0, region, 1) == 0 {
            DeleteObject(region);
        }
    }
}

pub fn show_webview_startup_error(error: &str) {
    let error = error.to_ascii_lowercase();
    if !error.contains("webview2 error") || !error.contains("0x80070002") {
        return;
    }

    let title = to_wide("Open Multiplayer Launcher");
    let message = to_wide(
        "The launcher could not find the Microsoft Edge WebView2 Runtime.\n\nIf you are running under Wine, install the x86 Evergreen Runtime into the same Wine prefix, then start the launcher again.\n\nDownload: https://go.microsoft.com/fwlink/p/?LinkId=2124701",
    );

    unsafe {
        MessageBoxW(0, message.as_ptr(), title.as_ptr(), MB_OK | MB_ICONERROR);
    }
}

fn to_wide(value: &str) -> Vec<u16> {
    value.encode_utf16().chain(std::iter::once(0)).collect()
}
