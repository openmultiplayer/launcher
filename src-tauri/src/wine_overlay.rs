// Wine overlay support. Wine can't capture the WebView2 window with
// PrintWindow, and activating it can minimize the game. The launcher shares
// captured frames with the game; omp-wine.dll copies them into omp-client's
// bitmap.
//
// Shared block `Local\omp_overlay_frame_<pid>`: 32-byte little-endian header,
// followed by top-down BGRA frames. Closing waits for captures to finish;
// reconnects get a new window while the old one closes.
//

use std::collections::HashMap;
use std::sync::atomic::{AtomicBool, AtomicU32, AtomicU8, Ordering};
use std::sync::{Arc, Mutex};
use std::time::{Duration, Instant};

use once_cell::sync::Lazy;
use tauri::{Window, WindowEvent};
use webview2_com::{
    CapturePreviewCompletedHandler,
    Microsoft::Web::WebView2::Win32::{
        ICoreWebView2, COREWEBVIEW2_CAPTURE_PREVIEW_IMAGE_FORMAT_PNG,
    },
};
use windows::Win32::Graphics::Imaging::{
    CLSID_WICImagingFactory, GUID_WICPixelFormat32bppBGRA, IWICImagingFactory,
    WICBitmapDitherTypeNone, WICBitmapPaletteTypeCustom, WICDecodeMetadataCacheOnDemand,
};
use windows::Win32::System::Com::StructuredStorage::CreateStreamOnHGlobal;
use windows::Win32::System::Com::{
    CoCreateInstance, IStream, CLSCTX_INPROC_SERVER, STREAM_SEEK_SET,
};
use windows_sys::Win32::Foundation::{
    CloseHandle, HWND, INVALID_HANDLE_VALUE, LPARAM, LRESULT, WPARAM,
};
use windows_sys::Win32::System::Memory::{
    CreateFileMappingW, MapViewOfFile, UnmapViewOfFile, FILE_MAP_ALL_ACCESS,
    MEMORY_MAPPED_VIEW_ADDRESS, PAGE_READWRITE,
};
use windows_sys::Win32::UI::Input::KeyboardAndMouse::{EnableWindow, IsWindowEnabled};
use windows_sys::Win32::UI::Shell::{DefSubclassProc, SetWindowSubclass};
use windows_sys::Win32::UI::WindowsAndMessaging::{
    GetWindowLongW, IsWindow, SetWindowLongW, SetWindowPos, GWL_EXSTYLE, GWL_STYLE, HWND_BOTTOM,
    MA_NOACTIVATE, SWP_FRAMECHANGED, SWP_NOACTIVATE, SWP_NOSIZE, SWP_SHOWWINDOW, WINDOWPOS,
    WM_MOUSEACTIVATE, WM_WINDOWPOSCHANGING, WS_CLIPCHILDREN, WS_CLIPSIBLINGS, WS_EX_NOACTIVATE,
    WS_EX_TOOLWINDOW, WS_POPUP, WS_VISIBLE,
};

const MAGIC: u32 = 0x4650_4D4F; // "OMPF"
const VERSION: u32 = 1;
const HEADER: usize = 32;
const MAX_W: u32 = 3840;
const MAX_H: u32 = 2160;
// Where the frontend keeps putting the overlay, too
const PARK_X: i32 = -15000;
const PARK_Y: i32 = -15000;
const SUBCLASS_ID: usize = 0x6F6D_706F; // "ompo"
const CLOSE_GRACE: Duration = Duration::from_millis(1000);
// At most about 30 captures a second
const FRAME_INTERVAL: Duration = Duration::from_millis(33);

// An overlay's phase. Every change is a compare-and-swap, so a close that is
// cancelled by a reopen and a close finished by the capture loop never both win.
const OPEN: u8 = 0;
// close() was asked for: the loop closes the window when its capture is back
const CLOSING: u8 = 1;
// The window's close has been sent, once
const CLOSED: u8 = 2;

#[derive(Default)]
struct OverlayState {
    // The capture loop runs, and always has a CapturePreview in flight
    capturing: AtomicBool,
    phase: AtomicU8,
}

impl OverlayState {
    fn advance(&self, from: u8, to: u8) -> bool {
        self.phase
            .compare_exchange(from, to, Ordering::SeqCst, Ordering::SeqCst)
            .is_ok()
    }
}

static OVERLAYS: Lazy<Mutex<HashMap<String, Arc<OverlayState>>>> =
    Lazy::new(|| Mutex::new(HashMap::new()));

fn overlay_state(label: &str) -> Option<Arc<OverlayState>> {
    OVERLAYS
        .lock()
        .ok()
        .and_then(|overlays| overlays.get(label).cloned())
}

fn forget_overlay(label: &str) {
    if let Ok(mut overlays) = OVERLAYS.lock() {
        overlays.remove(label);
    }
}

// A game's omp-client has connected (ipc.rs, init:<pid>): inject the DLL that
// the Wine-only resource downloader placed in app-local data. Reconnecting
// only adds another reference. Does nothing outside Wine.
pub fn inject_hook(app: &tauri::AppHandle, game_pid: i32) {
    if !crate::wine::is_wine() {
        return;
    }
    let Some(dir) = app.path_resolver().app_local_data_dir() else {
        log::warn!("[wine_overlay] no app data folder for omp-wine.dll");
        return;
    };
    std::thread::spawn(move || {
        let path = dir.join("omp").join("omp-wine.dll");
        if !path.is_file() {
            log::warn!(
                "[wine_overlay] omp-wine.dll has not been downloaded: {}",
                path.display()
            );
            return;
        }
        let injected = dll_syringe::process::OwnedProcess::from_pid(game_pid as u32)
            .map_err(|e| e.to_string())
            .and_then(|process| {
                dll_syringe::Syringe::for_process(process)
                    .inject(&path)
                    .map(|_| ())
                    .map_err(|e| e.to_string())
            });
        match injected {
            Ok(()) => log::info!("[wine_overlay] omp-wine.dll injected into game {}", game_pid),
            Err(e) => log::warn!(
                "[wine_overlay] cannot inject omp-wine.dll into game {}: {}",
                game_pid,
                e
            ),
        }
    });
}

// Set up a freshly built overlay window. Outside Wine it is only tracked.
pub fn attach(window: &Window, game_pid: i32) {
    // Tracked everywhere, so a reopen never reuses a window that is closing
    let state = Arc::new(OverlayState::default());
    if let Ok(mut overlays) = OVERLAYS.lock() {
        overlays.insert(window.label().to_string(), state.clone());
    }

    if !crate::wine::is_wine() {
        return;
    }
    let Ok(hwnd) = window.hwnd() else {
        return;
    };
    let hwnd = hwnd.0;

    // tao re-applies its own styles on some changes, so put ours back
    window.on_window_event(move |event| {
        if matches!(
            event,
            WindowEvent::Moved(_) | WindowEvent::Resized(_) | WindowEvent::Focused(_)
        ) {
            unsafe { keep_parked(hwnd) };
        }
    });

    // WebView2 and window subclassing both want the window's own thread
    let owner = window.clone();
    let _ = window.with_webview(move |webview| unsafe {
        park(hwnd);
        let Ok(core) = webview.controller().CoreWebView2() else {
            log::warn!("[wine_overlay] no CoreWebView2 for the overlay window");
            return;
        };
        match Capture::new(hwnd, game_pid as u32, core, owner, state) {
            Some(capture) => {
                log::info!(
                    "[wine_overlay] serving overlay frames for game {}",
                    game_pid
                );
                capture_next(Box::new(capture));
            }
            None => log::warn!(
                "[wine_overlay] could not set up frame capture for game {}",
                game_pid
            ),
        }
    });
}

// Close an overlay without destroying its WebView under a capture. The capture
// loop closes it when its capture is back, or after CLOSE_GRACE. Anything that
// is not a capturing overlay (not Wine, a failed attach) closes at once.
pub fn close(window: &Window) {
    let label = window.label().to_string();
    let Some(state) = overlay_state(&label) else {
        let _ = window.close();
        return;
    };
    if !state.advance(OPEN, CLOSING) {
        return;
    }
    if !state.capturing.load(Ordering::SeqCst) {
        if state.advance(CLOSING, CLOSED) {
            forget_overlay(&label);
            let _ = window.close();
        }
        return;
    }
    let late = window.clone();
    std::thread::spawn(move || {
        std::thread::sleep(CLOSE_GRACE);
        // Not if a reopen cancelled the close meanwhile
        if state.advance(CLOSING, CLOSED) {
            log::warn!(
                "[wine_overlay] {}: its capture never came back; closing anyway",
                late.label()
            );
            forget_overlay(late.label());
            let _ = late.close();
        }
    });
}

// The game asks for its overlay again. True when this window can be used: it
// is open, or its pending close was cancelled. False when it is going away
// (its close was sent, which is at once outside Wine), and a new one has to be
// built once it is gone.
pub fn reopen(window: &Window) -> bool {
    let Some(state) = overlay_state(window.label()) else {
        return false;
    };
    state.advance(CLOSING, OPEN) || state.phase.load(Ordering::SeqCst) == OPEN
}

unsafe fn park(hwnd: HWND) {
    SetWindowLongW(
        hwnd,
        GWL_STYLE,
        (WS_POPUP | WS_VISIBLE | WS_CLIPCHILDREN | WS_CLIPSIBLINGS) as i32,
    );
    SetWindowLongW(
        hwnd,
        GWL_EXSTYLE,
        (WS_EX_TOOLWINDOW | WS_EX_NOACTIVATE) as i32,
    );
    EnableWindow(hwnd, 0);
    SetWindowSubclass(hwnd, Some(no_activate), SUBCLASS_ID, 0);
    SetWindowPos(
        hwnd,
        HWND_BOTTOM,
        PARK_X,
        PARK_Y,
        0,
        0,
        SWP_NOSIZE | SWP_NOACTIVATE | SWP_FRAMECHANGED | SWP_SHOWWINDOW,
    );
}

unsafe fn keep_parked(hwnd: HWND) {
    if (GetWindowLongW(hwnd, GWL_EXSTYLE) as u32) & WS_EX_NOACTIVATE == 0
        || IsWindowEnabled(hwnd) != 0
    {
        park(hwnd);
    }
}

unsafe extern "system" fn no_activate(
    hwnd: HWND,
    msg: u32,
    wparam: WPARAM,
    lparam: LPARAM,
    _id: usize,
    _data: usize,
) -> LRESULT {
    match msg {
        // show() and moves must never take focus from the game
        WM_WINDOWPOSCHANGING => (*(lparam as *mut WINDOWPOS)).flags |= SWP_NOACTIVATE,
        WM_MOUSEACTIVATE => return MA_NOACTIVATE as LRESULT,
        _ => {}
    }
    DefSubclassProc(hwnd, msg, wparam, lparam)
}

struct Capture {
    hwnd: HWND,
    webview: ICoreWebView2,
    stream: IStream,
    factory: IWICImagingFactory,
    frames: Arc<Mutex<FrameBlock>>,
    window: Window,
    state: Arc<OverlayState>,
    started: Instant,
}

// A capture handed back to the window's thread after waiting out FRAME_INTERVAL
struct Later(Box<Capture>);

// Only ever used again on the window's thread, which created it
unsafe impl Send for Later {}

impl Capture {
    unsafe fn new(
        hwnd: HWND,
        game_pid: u32,
        webview: ICoreWebView2,
        window: Window,
        state: Arc<OverlayState>,
    ) -> Option<Self> {
        let stream = CreateStreamOnHGlobal(0, true).ok()?;
        let factory: IWICImagingFactory =
            CoCreateInstance(&CLSID_WICImagingFactory, None, CLSCTX_INPROC_SERVER).ok()?;
        let frames = frame_block(game_pid)?;
        Some(Self {
            hwnd,
            webview,
            stream,
            factory,
            frames,
            window,
            state,
            started: Instant::now(),
        })
    }

    // Decode the PNG CapturePreview wrote into the stream into the block
    unsafe fn publish(&mut self) -> windows::core::Result<()> {
        self.stream.Seek(0, STREAM_SEEK_SET)?;
        let decoder = self.factory.CreateDecoderFromStream(
            &self.stream,
            std::ptr::null(),
            WICDecodeMetadataCacheOnDemand,
        )?;
        let frame = decoder.GetFrame(0)?;
        let converter = self.factory.CreateFormatConverter()?;
        converter.Initialize(
            &frame,
            &GUID_WICPixelFormat32bppBGRA,
            WICBitmapDitherTypeNone,
            None,
            0.0,
            WICBitmapPaletteTypeCustom,
        )?;
        let (mut width, mut height) = (0u32, 0u32);
        converter.GetSize(&mut width, &mut height)?;
        if width == 0 || height == 0 || width > MAX_W || height > MAX_H {
            return Ok(());
        }
        let stride = width * 4;
        let Ok(mut frames) = self.frames.lock() else {
            return Ok(());
        };
        frames.write(width, height, stride, |pixels| {
            converter.CopyPixels(std::ptr::null(), stride, pixels)
        })
    }
}

// One capture at a time, back to back, for as long as the window lives. Runs
// on the window's thread, as do the completions.
fn capture_next(mut capture: Box<Capture>) {
    unsafe {
        let state = capture.state.clone();
        // close() is waiting for this capture, unless a reopen cancelled it
        if state.advance(CLOSING, CLOSED) {
            state.capturing.store(false, Ordering::SeqCst);
            forget_overlay(capture.window.label());
            let _ = capture.window.close();
            return;
        }
        if IsWindow(capture.hwnd) == 0 {
            state.capturing.store(false, Ordering::SeqCst);
            forget_overlay(capture.window.label());
            return;
        }
        keep_parked(capture.hwnd);
        capture.started = Instant::now();
        let _ = capture.stream.SetSize(0);
        let _ = capture.stream.Seek(0, STREAM_SEEK_SET);
        let webview = capture.webview.clone();
        let stream = capture.stream.clone();
        let handler = CapturePreviewCompletedHandler::create(Box::new(move |result| {
            if result.is_ok() {
                if let Err(e) = capture.publish() {
                    log::warn!("[wine_overlay] frame decode failed: {}", e);
                }
            }
            let wait = FRAME_INTERVAL.saturating_sub(capture.started.elapsed());
            if wait.is_zero() {
                capture_next(capture);
            } else {
                let window = capture.window.clone();
                let later = Later(capture);
                std::thread::spawn(move || {
                    std::thread::sleep(wait);
                    let _ = window.run_on_main_thread(move || {
                        let later = later;
                        capture_next(later.0);
                    });
                });
            }
            Ok(())
        }));
        state.capturing.store(true, Ordering::SeqCst);
        if let Err(e) = webview.CapturePreview(
            COREWEBVIEW2_CAPTURE_PREVIEW_IMAGE_FORMAT_PNG,
            &stream,
            &handler,
        ) {
            state.capturing.store(false, Ordering::SeqCst);
            log::warn!(
                "[wine_overlay] CapturePreview failed, overlay frames stop: {}",
                e
            );
        }
    }
}

// The named shared memory block the game reads
struct FrameBlock {
    mapping: isize,
    view: *mut u8,
}

// Only touched under its Mutex
unsafe impl Send for FrameBlock {}

// One block per game, kept for as long as the game runs. The game maps the
// block once and keeps reading it, and under Wine the name of a block goes
// away with the last handle, even while the game still has it mapped. A block
// per overlay would leave the game reading a dead block after a reopen.
static FRAME_BLOCKS: Lazy<Mutex<HashMap<u32, Arc<Mutex<FrameBlock>>>>> =
    Lazy::new(|| Mutex::new(HashMap::new()));

fn frame_block(game_pid: u32) -> Option<Arc<Mutex<FrameBlock>>> {
    let mut blocks = FRAME_BLOCKS.lock().ok()?;
    if let Some(block) = blocks.get(&game_pid) {
        return Some(block.clone());
    }
    // Drop the blocks of games that have exited
    blocks.retain(|pid, _| crate::commands::is_process_alive(*pid));
    let block = Arc::new(Mutex::new(unsafe { FrameBlock::open(game_pid)? }));
    blocks.insert(game_pid, block.clone());
    Some(block)
}

impl FrameBlock {
    unsafe fn open(game_pid: u32) -> Option<Self> {
        let size = HEADER as u64 + (MAX_W as u64 * 4) * MAX_H as u64;
        let name = wide(&format!("Local\\omp_overlay_frame_{}", game_pid));
        let mapping = CreateFileMappingW(
            INVALID_HANDLE_VALUE,
            std::ptr::null(),
            PAGE_READWRITE,
            (size >> 32) as u32,
            size as u32,
            name.as_ptr(),
        );
        if mapping == 0 {
            return None;
        }
        // Map exactly the size needed: this fails if another process created a
        // smaller block under the same name first
        let view: MEMORY_MAPPED_VIEW_ADDRESS =
            MapViewOfFile(mapping, FILE_MAP_ALL_ACCESS, 0, 0, size as usize);
        if view.Value.is_null() {
            CloseHandle(mapping);
            return None;
        }
        let block = Self {
            mapping,
            view: view.Value as *mut u8,
        };
        let header = block.view as *mut u32;
        header.add(0).write_volatile(MAGIC);
        header.add(1).write_volatile(VERSION);
        header.add(6).write_volatile(game_pid);
        Some(block)
    }

    fn seq(&self) -> &AtomicU32 {
        unsafe { &*(self.view.add(20) as *const AtomicU32) }
    }

    // Seqlock: odd while writing, so a reader never takes a torn frame
    unsafe fn write(
        &mut self,
        width: u32,
        height: u32,
        stride: u32,
        fill: impl FnOnce(&mut [u8]) -> windows::core::Result<()>,
    ) -> windows::core::Result<()> {
        let seq = self.seq().load(Ordering::Relaxed);
        self.seq().store(seq | 1, Ordering::Release);
        let pixels =
            std::slice::from_raw_parts_mut(self.view.add(HEADER), (stride * height) as usize);
        let result = fill(pixels);
        let header = self.view as *mut u32;
        header.add(2).write_volatile(width);
        header.add(3).write_volatile(height);
        header.add(4).write_volatile(stride);
        self.seq()
            .store((seq | 1).wrapping_add(1), Ordering::Release);
        result
    }
}

impl Drop for FrameBlock {
    fn drop(&mut self) {
        unsafe {
            UnmapViewOfFile(MEMORY_MAPPED_VIEW_ADDRESS {
                Value: self.view as *mut _,
            });
            CloseHandle(self.mapping);
        }
    }
}

fn wide(s: &str) -> Vec<u16> {
    s.encode_utf16().chain(std::iter::once(0)).collect()
}
