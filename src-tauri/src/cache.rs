use once_cell::sync::Lazy;
use serde::{Deserialize, Serialize};
use std::collections::{BTreeMap, HashSet};
use std::ffi::OsStr;
use std::net::Ipv4Addr;
use std::path::{Path, PathBuf};
use std::sync::atomic::{AtomicBool, AtomicU64, Ordering};
use std::sync::{Mutex, MutexGuard};
use std::time::{Duration, Instant};

#[cfg(windows)]
mod windows;
#[cfg(windows)]
use windows::{DirectoryBuffer, Handle, Identity, Resource};

const MAX_TREE_NODES: usize = 50_000;
const MAX_TREE_DEPTH: usize = 256;
const MAX_SNAPSHOT_NODES: usize = 100_000;
const SNAPSHOT_TTL: Duration = Duration::from_secs(600);

static OPERATION: AtomicBool = AtomicBool::new(false);
static LAUNCH_GATE: Lazy<Mutex<()>> = Lazy::new(|| Mutex::new(()));
static GAME_NAMES: Lazy<Mutex<HashSet<String>>> = Lazy::new(|| Mutex::new(HashSet::new()));
static SCAN_SEQUENCE: AtomicU64 = AtomicU64::new(1);

#[cfg(windows)]
static SNAPSHOT: Lazy<Mutex<Option<Snapshot>>> = Lazy::new(|| Mutex::new(None));

struct Operation;
impl Operation {
    fn begin() -> Result<Self, String> {
        OPERATION
            .compare_exchange(false, true, Ordering::SeqCst, Ordering::SeqCst)
            .map_err(|_| "operation_in_progress".to_string())?;
        Ok(Self)
    }
}
impl Drop for Operation {
    fn drop(&mut self) {
        OPERATION.store(false, Ordering::SeqCst);
    }
}

// The caller must retain this guard through spawning and remembering the exe name
pub fn guard_game_launch() -> crate::errors::Result<MutexGuard<'static, ()>> {
    LAUNCH_GATE.try_lock().map_err(|_| {
        crate::errors::LauncherError::InternalError("operation_in_progress".to_string())
    })
}

pub fn remember_game_name(name: &str) {
    if let Ok(mut names) = GAME_NAMES.lock() {
        names.insert(name.to_lowercase());
    }
}

#[derive(Serialize, Clone, Copy, Debug, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum GameState {
    Stopped,
    Running,
    Unknown,
}

impl GameState {
    fn ensure_stopped(self) -> Result<(), String> {
        match self {
            Self::Stopped => Ok(()),
            Self::Running => Err("game_running".into()),
            Self::Unknown => Err("process_check_failed".into()),
        }
    }
}

#[derive(Serialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct CacheEntry {
    pub id: String,
    pub folder_name: String,
    pub ip: String,
    pub port: u16,
    pub server_address: String,
    pub size_bytes: String,
    pub file_count: u32,
    pub complete: bool,
    pub can_delete: bool,
    pub issue_code: Option<String>,
}

#[derive(Serialize, Debug)]
#[serde(rename_all = "camelCase")]
pub struct CacheScanResult {
    pub scan_id: Option<String>,
    pub root_path: Option<String>,
    pub root_status: String,
    pub game_state: GameState,
    pub entries: Vec<CacheEntry>,
    pub total_known_size_bytes: String,
    pub total_known_file_count: u64,
    pub complete: bool,
}

#[derive(Deserialize, Clone)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct CacheDeleteRequest {
    pub scan_id: String,
    pub entry_ids: Vec<String>,
    pub custom_game_exe: Option<String>,
}

#[derive(Serialize, Debug)]
#[serde(rename_all = "camelCase")]
pub struct CacheDeleteItemResult {
    pub id: String,
    pub status: DeleteStatus,
    pub removed_resource_bytes: String,
    pub error_code: Option<String>,
}

#[derive(Serialize, Debug)]
#[serde(rename_all = "snake_case")]
pub enum DeleteStatus {
    Deleted,
    AlreadyMissing,
    Failed,
    Partial,
    Skipped,
}

#[derive(Serialize, Debug)]
#[serde(rename_all = "camelCase")]
pub struct CacheDeleteResult {
    pub items: Vec<CacheDeleteItemResult>,
    pub stopped_reason: Option<String>,
}

fn endpoint(folder: &str) -> Option<(Ipv4Addr, u16)> {
    let (ip, port) = folder.rsplit_once('.')?;
    let ip: Ipv4Addr = ip.parse().ok()?;
    let port: u16 = port.parse().ok()?;
    (endpoint_folder(&ip.to_string(), port).as_deref() == Some(folder)).then_some((ip, port))
}

fn endpoint_folder(host: &str, port: u16) -> Option<String> {
    let ip = if host == "localhost" {
        Ipv4Addr::LOCALHOST
    } else {
        host.parse().ok()?
    };
    (port != 0).then(|| format!("{}.{}", ip, port))
}

fn resource_file(name: &Path) -> bool {
    name.extension()
        .and_then(OsStr::to_str)
        .map(|extension| {
            extension.eq_ignore_ascii_case("dff") || extension.eq_ignore_ascii_case("txd")
        })
        .unwrap_or(false)
}

fn validate_exe(name: Option<&str>) -> Result<Option<String>, String> {
    let Some(name) = name.filter(|name| !name.is_empty()) else {
        return Ok(None);
    };
    if name.ends_with([' ', '.'])
        || name
            .chars()
            .any(|c| c.is_control() || "\\/:<>\"|?*".contains(c))
        || !name.to_ascii_lowercase().ends_with(".exe")
        || name.len() > 255
        || Path::new(name).file_name() != Some(OsStr::new(name))
    {
        return Err("invalid_selection".to_string());
    }
    Ok(Some(name.to_lowercase()))
}

#[cfg(windows)]
fn check_game(custom: Option<&str>) -> Result<GameState, String> {
    let custom = validate_exe(custom)?;
    let mut system = sysinfo::System::new();

    // Start fresh so failure leaves an empty list and prevents deletion
    system.refresh_processes_specifics(sysinfo::ProcessRefreshKind::new());
    if system.processes().is_empty() {
        return Err("process_check_failed".to_string());
    }
    let known = GAME_NAMES
        .lock()
        .map_err(|_| "process_check_failed".to_string())?;
    let mut unknown = false;
    for (pid, process) in system.processes() {
        let name = process.name().to_lowercase();
        if name == "gta_sa.exe" || custom.as_ref() == Some(&name) || known.contains(&name) {
            return Ok(GameState::Running);
        }
        if pid.as_u32() > 4 && name.is_empty() {
            unknown = true;
        }
    }
    if unknown {
        Err("process_check_failed".to_string())
    } else {
        Ok(GameState::Stopped)
    }
}

#[cfg(windows)]
fn io_code(error: &std::io::Error) -> String {
    log::warn!("Cache filesystem operation: {}", error);
    let message = error.to_string();
    match message.as_str() {
        "reparse_point" | "unsafe_path" | "cache_changed" | "invalid_cache_root" | "scan_limit" => {
            message
        }
        _ if error.kind() == std::io::ErrorKind::PermissionDenied => "access_denied".into(),
        _ if error.kind() == std::io::ErrorKind::NotFound => "already_missing".into(),
        _ => "delete_failed".into(),
    }
}

#[cfg(windows)]
struct Root {
    handles: Vec<Handle>,
    identities: Vec<Identity>,
    path: PathBuf,
}

#[cfg(windows)]
impl Root {
    fn open(documents: &Path) -> Result<Option<Self>, String> {
        // Allow OS redirection at Documents (e.g. OneDrive), then reject reparse
        // points below it. Retained ancestor handles pin the root, path is display-only.
        let mut handles = vec![Handle::documents(documents).map_err(|e| io_code(&e))?];
        let mut identities = vec![handles[0].identity().map_err(|e| io_code(&e))?];
        let mut path = documents.to_path_buf();
        for segment in ["GTA San Andreas User Files", "SAMP", "cache"] {
            let next = match handles
                .last()
                .unwrap()
                .child(OsStr::new(segment), true, false)
            {
                Ok(next) => next,
                Err(error) if error.kind() == std::io::ErrorKind::NotFound => return Ok(None),
                Err(error) => return Err(io_code(&error)),
            };
            identities.push(next.identity().map_err(|e| io_code(&e))?);
            handles.push(next);
            path.push(segment);
        }
        Ok(Some(Self {
            handles,
            identities,
            path,
        }))
    }
    fn handle(&self) -> &Handle {
        self.handles.last().unwrap()
    }
    fn verify(&self) -> Result<(), String> {
        for handle in self.handles.iter().skip(1) {
            let attributes = handle.attributes().map_err(|error| io_code(&error))?;
            if attributes & windows_sys::Win32::Storage::FileSystem::FILE_ATTRIBUTE_REPARSE_POINT
                != 0
            {
                return Err("reparse_point".into());
            }
        }
        Ok(())
    }
}

#[cfg(windows)]
#[derive(Clone)]
struct EntrySnapshot {
    folder: String,
    directories: BTreeMap<PathBuf, Identity>,
    resources: BTreeMap<PathBuf, Resource>,
    complete: bool,
}

#[cfg(windows)]
struct Snapshot {
    id: String,
    created: Instant,
    roots: Vec<Identity>,
    entries: BTreeMap<String, EntrySnapshot>,
}

#[cfg(windows)]
#[derive(Default)]
struct Tree {
    directories: BTreeMap<PathBuf, Identity>,
    resources: BTreeMap<PathBuf, Resource>,
    pinned: Vec<(Handle, Option<u64>, usize)>,
    bytes: u64,
    issue: Option<String>,
}

#[cfg(windows)]
impl Tree {
    fn failed(issue: impl Into<String>) -> Self {
        Self {
            issue: Some(issue.into()),
            ..Self::default()
        }
    }
}

#[cfg(windows)]
fn walk(
    item: Handle,
    deleting: bool,
    snapshot_budget: usize,
    buffer: &mut DirectoryBuffer,
) -> Tree {
    let Some(mut remaining) = snapshot_budget.checked_sub(1) else {
        return Tree::failed("scan_limit");
    };
    let mut tree = Tree::default();
    let mut queue = vec![(PathBuf::new(), item, 0)];
    let mut visited = 0usize;
    while let Some((relative, directory, depth)) = queue.pop() {
        let identity = match directory.identity() {
            Ok(identity) => identity,
            Err(error) => {
                tree.issue = Some(io_code(&error));
                break;
            }
        };
        tree.directories.insert(relative.clone(), identity);
        let enumeration = directory.for_each_child(buffer, |name, is_directory, is_reparse| {
            visited += 1;
            if visited > MAX_TREE_NODES {
                return Err(std::io::Error::new(
                    std::io::ErrorKind::InvalidData,
                    "scan_limit",
                ));
            }
            if is_reparse {
                tree.issue = Some("reparse_point".into());
                return Ok(());
            }
            let is_resource = !is_directory && resource_file(Path::new(name));

            if !is_directory && !is_resource && !deleting {
                return Ok(());
            }

            if (is_directory && depth == MAX_TREE_DEPTH)
                || ((is_directory || is_resource) && remaining == 0)
            {
                return Err(std::io::Error::new(
                    std::io::ErrorKind::InvalidData,
                    "scan_limit",
                ));
            }


            let child = match directory.child(name, is_directory, deleting) {
                Ok(child) => child,
                Err(error) => {
                    tree.issue = Some(io_code(&error));
                    return Ok(());
                }
            };
            let child_path = relative.join(name);
            if is_directory {
                remaining -= 1;
                queue.push((child_path, child, depth + 1));
                return Ok(());
            }
            let bytes = if is_resource {
                let resource = match child.resource() {
                    Ok(resource) => resource,
                    Err(error) => {
                        tree.issue = Some(io_code(&error));
                        return Ok(());
                    }
                };
                match tree.bytes.checked_add(resource.bytes) {
                    Some(total) => tree.bytes = total,
                    None => {
                        tree.issue = Some("size_overflow".into());
                        return Ok(());
                    }
                }
                let bytes = resource.bytes;
                remaining -= 1;
                tree.resources.insert(child_path, resource);
                Some(bytes)
            } else {
                None
            };
            if deleting {
                tree.pinned.push((child, bytes, depth + 1));
            }
            Ok(())
        });
        if deleting {
            tree.pinned.push((directory, None, depth));
        }
        if let Err(error) = enumeration {
            tree.issue = Some(io_code(&error));
            break;
        }
    }
    tree
}

#[cfg(windows)]
fn scan_at(
    documents: &Path,
    game_state: GameState,
) -> Result<(CacheScanResult, Option<Snapshot>), String> {
    let mut result = CacheScanResult {
        scan_id: None,
        root_path: None,
        root_status: "missing".into(),
        game_state,
        entries: Vec::new(),
        total_known_size_bytes: "0".into(),
        total_known_file_count: 0,
        complete: true,
    };
    let Some(root) = Root::open(documents)? else {
        return Ok((result, None));
    };
    let id = format!(
        "{}-{}",
        std::process::id(),
        SCAN_SEQUENCE.fetch_add(1, Ordering::Relaxed)
    );
    let mut snapshot = Snapshot {
        id: id.clone(),
        created: Instant::now(),
        roots: root.identities.clone(),
        entries: BTreeMap::new(),
    };
    let mut total_bytes = 0u64;
    let mut snapshot_nodes = 0usize;
    let mut buffer = DirectoryBuffer::default();
    let mut folders = Vec::new();
    root.handle()
        .for_each_child(&mut buffer, |name, is_directory, is_reparse| {
            if is_directory {
                if let Some((ip, port)) = name.to_str().and_then(endpoint) {
                    folders.push((name.to_os_string(), ip, port, is_reparse));
                }
            }
            Ok(())
        })
        .map_err(|error| io_code(&error))?;
    folders.sort_by(|a, b| a.0.cmp(&b.0));
    for (name, ip, port, is_reparse) in folders {
        let folder = name.to_str().unwrap();
        let entry_id = format!("{}:{}", id, snapshot.entries.len());
        let tree = if is_reparse {
            Tree::failed("reparse_point")
        } else if snapshot_nodes == MAX_SNAPSHOT_NODES {
            Tree::failed("scan_limit")
        } else {
            match root.handle().child(&name, true, false) {
                Ok(item) => walk(
                    item,
                    false,
                    MAX_SNAPSHOT_NODES - snapshot_nodes,
                    &mut buffer,
                ),
                Err(error) => Tree::failed(io_code(&error)),
            }
        };

        snapshot_nodes += tree.directories.len() + tree.resources.len();

        let complete = tree.issue.is_none();
        total_bytes = total_bytes.checked_add(tree.bytes).ok_or("size_overflow")?;
        result.total_known_file_count += tree.resources.len() as u64;
        result.complete &= complete;
        result.entries.push(CacheEntry {
            id: entry_id.clone(),
            folder_name: folder.into(),
            ip: ip.to_string(),
            port,
            server_address: format!("{}:{}", ip, port),
            size_bytes: tree.bytes.to_string(),
            file_count: tree.resources.len() as u32,
            complete,
            can_delete: complete && game_state == GameState::Stopped,
            issue_code: tree.issue,
        });
        snapshot.entries.insert(
            entry_id,
            EntrySnapshot {
                folder: folder.into(),
                directories: tree.directories,
                resources: tree.resources,
                complete,
            },
        );
    }
    result.scan_id = Some(id);
    result.root_path = Some(root.path.to_string_lossy().into_owned());
    result.root_status = "present".into();
    result.total_known_size_bytes = total_bytes.to_string();
    Ok((result, Some(snapshot)))
}

#[cfg(windows)]
pub fn scan(custom_game_exe: Option<String>) -> Result<CacheScanResult, String> {
    let _operation = Operation::begin()?;
    if let Some(name) = validate_exe(custom_game_exe.as_deref())? {
        remember_game_name(&name);
    }
    // A new scan revokes the previous selection even if traversal subsequently fails
    *SNAPSHOT.lock().map_err(|_| "stale_scan")? = None;
    let documents = tauri::api::path::document_dir().ok_or("documents_unavailable")?;
    let game_state = check_game(custom_game_exe.as_deref()).unwrap_or(GameState::Unknown);
    let (result, snapshot) = scan_at(&documents, game_state)?;
    *SNAPSHOT.lock().map_err(|_| "stale_scan")? = snapshot;
    Ok(result)
}

#[cfg(not(windows))]
pub fn scan(_: Option<String>) -> Result<CacheScanResult, String> {
    Err("unsupported_platform".into())
}

#[cfg(windows)]
fn validate_selection<'a>(
    snapshot: &'a Snapshot,
    request: &CacheDeleteRequest,
) -> Result<Vec<&'a EntrySnapshot>, String> {
    if request.scan_id != snapshot.id || snapshot.created.elapsed() > SNAPSHOT_TTL {
        return Err("stale_scan".into());
    }
    if request.entry_ids.is_empty() || request.entry_ids.len() > snapshot.entries.len() {
        return Err("invalid_selection".into());
    }
    let mut seen = HashSet::new();
    request
        .entry_ids
        .iter()
        .map(|id| {
            if !seen.insert(id) {
                return Err("invalid_selection".into());
            }
            let entry = snapshot.entries.get(id).ok_or("invalid_selection")?;
            if !entry.complete || endpoint(&entry.folder).is_none() {
                return Err("invalid_selection".into());
            }
            Ok(entry)
        })
        .collect()
}

#[cfg(windows)]
fn delete_at(
    documents: &Path,
    snapshot: Snapshot,
    request: CacheDeleteRequest,
    mut game_check: impl FnMut() -> Result<GameState, String>,
) -> Result<CacheDeleteResult, String> {
    let selected = validate_selection(&snapshot, &request)?;
    game_check()?.ensure_stopped()?;
    let root = Root::open(documents)?.ok_or("cache_changed")?;
    if root.identities != snapshot.roots {
        return Err("cache_changed".into());
    }
    let mut result = CacheDeleteResult {
        items: Vec::new(),
        stopped_reason: None,
    };
    let mut buffer = DirectoryBuffer::default();
    for (id, entry) in request.entry_ids.iter().zip(selected) {
        if result.stopped_reason.is_none() {
            result.stopped_reason = game_check()
                .and_then(GameState::ensure_stopped)
                .err()
                .or_else(|| root.verify().err());
        }
        let mut item = CacheDeleteItemResult {
            id: id.clone(),
            status: DeleteStatus::Skipped,
            removed_resource_bytes: "0".into(),
            error_code: result.stopped_reason.clone(),
        };
        if result.stopped_reason.is_none() {
            match root.handle().child(OsStr::new(&entry.folder), true, true) {
                Err(error) => {
                    let code = io_code(&error);
                    if code == "already_missing" {
                        item.status = DeleteStatus::AlreadyMissing;
                    } else {
                        item.status = DeleteStatus::Failed;
                        item.error_code = Some(code);
                    }
                }
                Ok(handle) => {
                    // Preflight pins the whole group with exclusive handles and matches
                    // directory IDs plus resource identity/size/mtime before any removal.
                    let mut tree = walk(handle, true, MAX_TREE_NODES + 1, &mut buffer);
                    let issue = tree.issue.take().or_else(|| {
                        if tree.directories != entry.directories
                            || tree.resources != entry.resources
                        {
                            Some("cache_changed".into())
                        } else {
                            None
                        }
                    });
                    if let Some(issue) = issue {
                        item.status = DeleteStatus::Failed;
                        item.error_code = Some(issue);
                    } else {
                        // Parents are retained until their children have been removed.
                        // No path-based remove_dir_all is used, even after validation.
                        tree.pinned
                            .sort_by_key(|(_, _, depth)| std::cmp::Reverse(*depth));
                        let mut removed = 0u64;
                        let mut changed = false;
                        item.status = DeleteStatus::Deleted;
                        for (handle, bytes, _) in tree.pinned {
                            if let Err(error) = handle.delete() {
                                item.status = if changed {
                                    DeleteStatus::Partial
                                } else {
                                    DeleteStatus::Failed
                                };
                                item.error_code = Some(io_code(&error));
                                break;
                            }
                            changed = true;
                            removed += bytes.unwrap_or(0);
                        }
                        item.removed_resource_bytes = removed.to_string();
                    }
                }
            }
        }
        result.items.push(item);
    }
    Ok(result)
}

#[cfg(windows)]
pub fn delete(request: CacheDeleteRequest) -> Result<CacheDeleteResult, String> {
    let _operation = Operation::begin()?;
    let _launch = LAUNCH_GATE
        .try_lock()
        .map_err(|_| "operation_in_progress")?;
    if let Some(name) = validate_exe(request.custom_game_exe.as_deref())? {
        remember_game_name(&name);
    }
    let documents = tauri::api::path::document_dir().ok_or("documents_unavailable")?;
    // Consume the snapshot: validation failures and partial deletions after this
    // point also require a new scan before retrying any old selection.
    let snapshot = SNAPSHOT
        .lock()
        .map_err(|_| "stale_scan")?
        .take()
        .ok_or("stale_scan")?;
    let custom = request.custom_game_exe.clone();
    delete_at(&documents, snapshot, request, || {
        check_game(custom.as_deref())
    })
}

#[cfg(not(windows))]
pub fn delete(_: CacheDeleteRequest) -> Result<CacheDeleteResult, String> {
    Err("unsupported_platform".into())
}
