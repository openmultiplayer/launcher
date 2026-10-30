//! Downloads a server's custom models as a few compressed segments before the game starts.
//!
//! Servers running a recent open.mp expose the models on their web port (the same one used for
//! the in-game model downloads) as a few compressed segments, plus an index saying which file is
//! in which segment. Only the segments holding files we lack are downloaded. Anything unexpected -
//! no pack, a bad index, a network error - is logged and ignored, and the game downloads models
//! the usual way.

use serde::{Deserialize, Serialize};
use std::cell::Cell;
use std::collections::HashSet;
use std::fs::{self, File};
use std::io::{self, Read, Write};
use std::path::{Path, PathBuf};
use std::rc::Rc;
use std::time::{Duration, Instant};
use tauri::{AppHandle, Manager};

const MAX_FILES: usize = 200_000;
const MAX_SEGMENTS: usize = 2_048;
const DOWNLOAD_TIMEOUT: Duration = Duration::from_secs(120);

#[derive(Deserialize)]
struct Index {
    v: u32,
    /// Compressed size of each segment.
    packs: Vec<u64>,
    files: Vec<Entry>,
}

/// A cached model: `n` is the SA-MP cache file name (0x<CRC32>.<ext>), `s` its size, `c` its CRC32
/// and `p` the segment it is in.
#[derive(Deserialize)]
struct Entry {
    n: String,
    s: u64,
    c: u32,
    p: usize,
}

#[derive(Clone, Serialize)]
struct Progress {
    phase: &'static str,
    done: u64,
    total: u64,
    files: usize,
}

pub async fn prefetch(app: AppHandle, ip: String, port: i32) {
    match tokio::task::spawn_blocking(move || run(&app, &ip, port)).await {
        Ok(Ok(())) => {}
        Ok(Err(e)) => log::warn!("[model_pack] skipped, using regular downloads: {}", e),
        Err(e) => log::warn!("[model_pack] task failed: {}", e),
    }
}

fn run(app: &AppHandle, ip: &str, port: i32) -> Result<(), String> {
    if !ip.chars().all(|c| c.is_ascii_digit() || c == '.') || !(1..=65535).contains(&port) {
        return Err("unsupported server address".into());
    }
    let agent = ureq::AgentBuilder::new()
        .timeout_connect(Duration::from_secs(2))
        .timeout_read(Duration::from_secs(20))
        .redirects(0)
        .build();
    let base = format!("http://{}:{}/modelpack/v1", ip, port);

    // No pack (older server, other web port, no models): nothing to do.
    let Ok(response) = agent.get(&format!("{}/index.json", base)).call() else {
        return Ok(());
    };
    let mut body = String::new();
    response
        .into_reader()
        .take(32 << 20)
        .read_to_string(&mut body)
        .map_err(|e| e.to_string())?;
    let index: Index = serde_json::from_str(&body).map_err(|e| e.to_string())?;
    validate(&index)?;

    let dir =
        PathBuf::from(crate::samp::get_model_cache_folder()?).join(format!("{}.{}", ip, port));
    fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    let missing = missing_files(&index, &dir);
    if missing.is_empty() {
        return Ok(());
    }

    let mut needed: Vec<usize> = index
        .files
        .iter()
        .filter(|e| missing.contains(e.n.as_str()))
        .map(|e| e.p)
        .collect();
    needed.sort_unstable();
    needed.dedup();
    let total = needed.iter().fold(0u64, |sum, &segment| {
        sum.saturating_add(index.packs[segment])
    });
    let files = missing.len();
    let emit = |phase, done| {
        let _ = app.emit_all(
            "model-pack-progress",
            Progress {
                phase,
                done,
                total,
                files,
            },
        );
    };
    emit("start", 0);
    let deadline = Instant::now() + DOWNLOAD_TIMEOUT;
    let mut finished = 0;
    let mut result = Ok(());
    for segment in needed {
        result = download(
            &agent,
            &base,
            &dir,
            &index,
            segment,
            &missing,
            deadline,
            |done| emit("progress", finished + done),
        );
        if result.is_err() {
            break;
        }
        finished += index.packs[segment];
    }
    emit("end", total);
    result
}

/// The names of the files we do not have yet.
fn missing_files<'a>(index: &'a Index, dir: &Path) -> HashSet<&'a str> {
    index
        .files
        .iter()
        .filter(|e| !cached(dir, e))
        .map(|e| e.n.as_str())
        .collect()
}

fn validate(index: &Index) -> Result<(), String> {
    let packs = &index.packs;
    let bad_layout = index.v != 1
        || packs.is_empty()
        || packs.len() > MAX_SEGMENTS
        || packs.iter().any(|&size| size == 0)
        || index.files.len() > MAX_FILES;
    if bad_layout {
        return Err("unsupported index".into());
    }
    let mut names = HashSet::new();
    let mut total = 0u64;
    for entry in &index.files {
        let extension = entry.n.rsplit('.').next().unwrap_or("");
        let valid = (extension == "dff" || extension == "txd")
            && entry.n == format!("0x{:X}.{}", entry.c, extension)
            && entry.p < packs.len()
            && names.insert(&entry.n);
        if !valid {
            return Err(format!("invalid entry {}", entry.n));
        }
        total = total.saturating_add(entry.s);
    }
    // Deflate can't shrink data by much more than 1000 to 1, so a bigger claim is wrong.
    let compressed = packs
        .iter()
        .fold(0u64, |sum, &size| sum.saturating_add(size));
    if total > compressed.saturating_mul(1100) {
        return Err("sizes do not add up".into());
    }
    Ok(())
}

fn crc_of(path: &Path) -> io::Result<(u64, u32)> {
    let mut file = File::open(path)?;
    let mut hasher = crc32fast::Hasher::new();
    let mut buffer = [0u8; 65536];
    let mut size = 0u64;
    loop {
        let count = file.read(&mut buffer)?;
        if count == 0 {
            return Ok((size, hasher.finalize()));
        }
        hasher.update(&buffer[..count]);
        size += count as u64;
    }
}

fn cached(dir: &Path, entry: &Entry) -> bool {
    matches!(crc_of(&dir.join(&entry.n)), Ok((size, crc)) if size == entry.s && crc == entry.c)
}

/// Counts the compressed bytes read so progress can be reported.
struct Counting<R> {
    inner: R,
    count: Rc<Cell<u64>>,
}

impl<R: Read> Read for Counting<R> {
    fn read(&mut self, buf: &mut [u8]) -> io::Result<usize> {
        let n = self.inner.read(buf)?;
        self.count.set(self.count.get() + n as u64);
        Ok(n)
    }
}

/// A server that is busy answers 503 with Retry-After. Wait and ask again a few times.
fn get_segment(agent: &ureq::Agent, url: &str) -> Result<ureq::Response, String> {
    for _ in 0..5 {
        match agent.get(url).call() {
            Err(ureq::Error::Status(503, response)) => {
                let seconds = response.header("Retry-After").and_then(|v| v.parse().ok());
                std::thread::sleep(Duration::from_secs(seconds.unwrap_or(5).min(15)));
            }
            other => return other.map_err(|e| e.to_string()),
        }
    }
    Err("server is busy".into())
}

/// Fetches one segment and writes the files we are missing, checking each one's CRC. The other
/// files in it are read past so the stream stays in step.
fn download(
    agent: &ureq::Agent,
    base: &str,
    dir: &Path,
    index: &Index,
    segment: usize,
    missing: &HashSet<&str>,
    deadline: Instant,
    progress: impl Fn(u64),
) -> Result<(), String> {
    let response = get_segment(agent, &format!("{}/pack/{}", base, segment))?;
    let count = Rc::new(Cell::new(0));
    let reader = Counting {
        inner: response.into_reader().take(index.packs[segment]),
        count: count.clone(),
    };
    let mut decoder = flate2::read::ZlibDecoder::new(reader);

    let mut buffer = [0u8; 65536];
    let mut last_report = 0u64;
    for entry in index.files.iter().filter(|e| e.p == segment) {
        let keep = missing.contains(entry.n.as_str());
        // The part name includes our process id, so a second launcher never touches it.
        let part = dir.join(format!("{}.{}.part", entry.n, std::process::id()));
        let mut read_file = || -> Result<(), String> {
            let mut out = if keep {
                Some(File::create(&part).map_err(|e| e.to_string())?)
            } else {
                None
            };
            let mut hasher = crc32fast::Hasher::new();
            let mut left = entry.s;
            while left > 0 {
                if Instant::now() > deadline {
                    return Err("download timed out".into());
                }
                let want = left.min(buffer.len() as u64) as usize;
                let got = decoder
                    .read(&mut buffer[..want])
                    .map_err(|e| e.to_string())?;
                if got == 0 {
                    return Err("pack ended early".into());
                }
                hasher.update(&buffer[..got]);
                if let Some(file) = out.as_mut() {
                    file.write_all(&buffer[..got]).map_err(|e| e.to_string())?;
                }
                left -= got as u64;
                if count.get() - last_report > (1 << 20) {
                    last_report = count.get();
                    progress(last_report);
                }
            }
            if hasher.finalize() != entry.c {
                return Err(format!("{} failed its checksum", entry.n));
            }
            drop(out);
            if keep {
                fs::rename(&part, dir.join(&entry.n)).map_err(|e| e.to_string())?;
            }
            Ok(())
        };
        if let Err(e) = read_file() {
            let _ = fs::remove_file(&part);
            return Err(e);
        }
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::net::TcpListener;

    fn entry(name: &str, data: &[u8]) -> Entry {
        in_segment(name, data, 0)
    }

    fn in_segment(name: &str, data: &[u8], p: usize) -> Entry {
        let extension = name.rsplit('.').next().unwrap();
        let crc = crc32fast::hash(data);
        Entry {
            n: format!("0x{:X}.{}", crc, extension),
            s: data.len() as u64,
            c: crc,
            p,
        }
    }

    fn temp_dir(name: &str) -> PathBuf {
        let dir = std::env::temp_dir().join(format!("model_pack_{}_{}", name, std::process::id()));
        let _ = fs::remove_dir_all(&dir);
        fs::create_dir_all(&dir).unwrap();
        dir
    }

    fn compress(files: &[&[u8]]) -> Vec<u8> {
        let mut encoder =
            flate2::write::ZlibEncoder::new(Vec::new(), flate2::Compression::default());
        for data in files {
            encoder.write_all(data).unwrap();
        }
        encoder.finish().unwrap()
    }

    /// Answers every request with `body`; returns the base URL.
    fn serve(body: Vec<u8>) -> String {
        serve_busy(body, 0)
    }

    /// Like `serve`, but the first `busy` requests get a 503 with `Retry-After: 0`.
    fn serve_busy(body: Vec<u8>, busy: usize) -> String {
        let listener = TcpListener::bind("127.0.0.1:0").unwrap();
        let port = listener.local_addr().unwrap().port();
        std::thread::spawn(move || {
            let mut busy = busy;
            for mut stream in listener.incoming().flatten() {
                let mut request = [0u8; 1024];
                let _ = stream.read(&mut request);
                if busy > 0 {
                    busy -= 1;
                    let _ = write!(
                        stream,
                        "HTTP/1.1 503 Service Unavailable\r\nRetry-After: 0\r\nContent-Length: 0\r\nConnection: close\r\n\r\n"
                    );
                    continue;
                }
                let _ = write!(
                    stream,
                    "HTTP/1.1 200 OK\r\nContent-Length: {}\r\nConnection: close\r\n\r\n",
                    body.len()
                );
                let _ = stream.write_all(&body);
            }
        });
        format!("http://127.0.0.1:{}", port)
    }

    fn fetch(base: &str, dir: &Path, idx: &Index, segment: usize) -> Result<(), String> {
        let missing = missing_files(idx, dir);
        let deadline = Instant::now() + DOWNLOAD_TIMEOUT;
        download(
            &ureq::agent(),
            base,
            dir,
            idx,
            segment,
            &missing,
            deadline,
            |_| {},
        )
    }

    fn index(files: Vec<Entry>, pack: u64) -> Index {
        Index {
            v: 1,
            packs: vec![pack],
            files,
        }
    }

    #[test]
    fn rejects_bad_indexes() {
        assert!(validate(&index(vec![entry("a.dff", b"abc")], 10)).is_ok());
        assert!(validate(&index(vec![], 0)).is_err());
        let mut bad_name = entry("a.dff", b"abc");
        bad_name.n = "../evil.dff".into();
        assert!(validate(&index(vec![bad_name], 10)).is_err());
        let mut wrong_crc = entry("a.txd", b"abc");
        wrong_crc.c ^= 1;
        assert!(validate(&index(vec![wrong_crc], 10)).is_err());
        let twice = vec![entry("a.dff", b"abc"), entry("b.dff", b"abc")];
        assert!(validate(&index(twice, 10)).is_err());
        assert!(validate(&Index {
            v: 2,
            packs: vec![10],
            files: vec![]
        })
        .is_err());
        let mut outside = entry("a.dff", b"abc");
        outside.p = 1;
        assert!(validate(&index(vec![outside], 10)).is_err());
        // Sizes no compressed pack could hold, or that overflow when added up, are refused.
        let mut huge = entry("a.dff", b"abc");
        huge.s = u64::MAX;
        assert!(validate(&index(vec![huge, entry("b.dff", b"abcd")], 10)).is_err());
        assert!(validate(&Index {
            v: 1,
            packs: vec![0],
            files: vec![]
        })
        .is_err());
        // There is no upper limit on the models as long as the sizes add up.
        let big = vec![Entry {
            s: 6 << 30,
            ..entry("a.dff", b"abc")
        }];
        assert!(validate(&Index {
            v: 1,
            packs: vec![3 << 30, 3 << 30],
            files: big
        })
        .is_ok());
    }

    #[test]
    fn installs_a_good_pack() {
        let (a, b) = (
            b"first model".as_slice(),
            b"second, longer model data".as_slice(),
        );
        let pack = compress(&[a, b]);
        let idx = index(
            vec![entry("a.dff", a), entry("b.txd", b)],
            pack.len() as u64,
        );
        let dir = temp_dir("good");
        let base = serve(pack);
        fetch(&base, &dir, &idx, 0).unwrap();
        for (file, data) in idx.files.iter().zip([a, b]) {
            assert_eq!(fs::read(dir.join(&file.n)).unwrap(), data);
        }
    }

    #[test]
    fn only_missing_files_are_wanted() {
        let files = vec![
            in_segment("a.dff", b"one", 0),
            in_segment("b.dff", b"two", 0),
            in_segment("c.dff", b"three", 1),
            in_segment("d.dff", b"four", 2),
            in_segment("e.dff", b"five", 2),
        ];
        let idx = Index {
            v: 1,
            packs: vec![10, 10, 10],
            files,
        };
        let dir = temp_dir("missing");
        assert_eq!(missing_files(&idx, &dir).len(), 5);
        for (file, data) in idx
            .files
            .iter()
            .zip([b"one".as_slice(), b"two", b"three", b"four"])
        {
            fs::write(dir.join(&file.n), data).unwrap();
        }
        assert_eq!(
            missing_files(&idx, &dir),
            HashSet::from([idx.files[4].n.as_str()])
        );
        fs::write(dir.join(&idx.files[4].n), b"five").unwrap();
        assert!(missing_files(&idx, &dir).is_empty());
    }

    #[test]
    fn waits_while_the_server_is_busy() {
        let a = b"model data".as_slice();
        let pack = compress(&[a]);
        let idx = index(vec![entry("a.dff", a)], pack.len() as u64);
        let dir = temp_dir("busy");
        let base = serve_busy(pack, 2);
        fetch(&base, &dir, &idx, 0).unwrap();
        assert!(cached(&dir, &idx.files[0]));
    }

    #[test]
    fn gives_up_when_the_server_stays_busy() {
        let a = b"model data".as_slice();
        let pack = compress(&[a]);
        let idx = index(vec![entry("a.dff", a)], pack.len() as u64);
        let dir = temp_dir("always_busy");
        let base = serve_busy(pack, 100);
        assert!(fetch(&base, &dir, &idx, 0).is_err());
        assert!(!cached(&dir, &idx.files[0]));
    }

    #[test]
    fn keeps_files_that_are_already_cached() {
        let (a, b) = (b"already here".as_slice(), b"still needed".as_slice());
        let pack = compress(&[a, b]);
        let idx = index(
            vec![entry("a.dff", a), entry("b.dff", b)],
            pack.len() as u64,
        );
        let dir = temp_dir("cached");
        fs::write(dir.join(&idx.files[0].n), a).unwrap();
        assert!(cached(&dir, &idx.files[0]) && !cached(&dir, &idx.files[1]));
        fetch(&serve(pack), &dir, &idx, 0).unwrap();
        assert!(cached(&dir, &idx.files[1]));
    }

    #[test]
    fn truncated_pack_leaves_no_bad_files() {
        let (a, b) = (vec![7u8; 5000], vec![9u8; 5000]);
        let mut pack = compress(&[&a, &b]);
        pack.truncate(pack.len() / 2);
        let idx = index(
            vec![entry("a.dff", &a), entry("b.dff", &b)],
            pack.len() as u64,
        );
        let dir = temp_dir("short");
        assert!(fetch(&serve(pack), &dir, &idx, 0).is_err());
        for file in fs::read_dir(&dir).unwrap().flatten() {
            let name = file.file_name().to_string_lossy().to_string();
            let known = idx
                .files
                .iter()
                .find(|e| e.n == name)
                .expect("only indexed files may remain");
            assert!(cached(&dir, known), "{} is incomplete", name);
        }
    }

    #[test]
    fn wrong_content_is_rejected() {
        let pack = compress(&[b"not what the index promised"]);
        let mut wrong = entry("a.dff", b"not what the index promised");
        wrong.c ^= 1;
        wrong.n = format!("0x{:X}.dff", wrong.c);
        let dir = temp_dir("wrong");
        let idx = index(vec![wrong], pack.len() as u64);
        assert!(fetch(&serve(pack), &dir, &idx, 0).is_err());
        assert_eq!(fs::read_dir(&dir).unwrap().count(), 0);
    }
}
