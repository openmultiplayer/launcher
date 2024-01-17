use std::fs;
use std::path::Path;

use chardet::{charset2encoding, detect};
use chardetng::EncodingDetector;
use charset_normalizer_rs::from_bytes;
use encoding_rs::{Encoding, UTF_8};
use log::info;

/// Decodes a buffer of bytes into a string, detecting the encoding
pub fn decode_buffer(buf: Vec<u8>) -> (String, String) {
    // Using chardetng for encoding detection
    let mut detector = EncodingDetector::new();
    detector.feed(&buf, true);
    let chardetng_encoding = detector.guess(None, true).name();

    // Using chardet for encoding detection
    let chardet_encoding = charset2encoding(&detect(&buf).0).to_string();

    // Using charset_normalizer_rs for encoding detection
    let charset_normalizer_encoding = from_bytes(&buf, None).get_best()
        .map(|cd| cd.encoding().to_string())
        .unwrap_or_else(|| "not_found".to_string());
        
    // Determine the most likely actual encoding
    let actual_encoding = if charset_normalizer_encoding == "macintosh" {
        // Use windows-1251 if charset_normalizer detects macintosh
        Encoding::for_label("windows-1251".as_bytes()).unwrap_or(UTF_8)
    } else if chardetng_encoding == "GBK" || chardetng_encoding == "GB2312" ||
              chardet_encoding == "GBK" || chardet_encoding == "GB2312" {
        // Use GB18030 for Chinese characters if detected as GBK or GB2312
        Encoding::for_label("GB18030".as_bytes()).unwrap_or(UTF_8)
    } else if chardetng_encoding == "windows-1252" && chardet_encoding == "windows-1251" {
        // Use windows-1251 if chardetng detects windows-1252 and chardet detects windows-1251
        Encoding::for_label("windows-1251".as_bytes()).unwrap_or(UTF_8)
    } else if chardet_encoding == "ISO-8859-1" && charset_normalizer_encoding == "ibm866" {
        // Use windows-1252 if chardet detects ISO-8859-1 and charset normalizer detects ibm866
        Encoding::for_label("windows-1252".as_bytes()).unwrap_or(UTF_8)
    } else {
        // Default to the encoding detected by chardetng
        Encoding::for_label(chardetng_encoding.as_bytes()).unwrap_or(UTF_8)
    };
    
    // Decode the buffer using the determined encoding
    // Note: Error handling for decoding errors is intentionally omitted. 
    // In cases where there are minor errors in the text (like a few corrupted characters),
    // this approach ensures that the text is still usable, albeit with some minor imperfections.
    let (decoded, _, _had_errors) = actual_encoding.decode(&buf);
    let buff_output = decoded.into_owned();

    // Return the decoded string and the encoding name
    (buff_output, actual_encoding.name().to_string())
}

pub fn copy_files(src: impl AsRef<Path>, dest: impl AsRef<Path>) -> Result<(), String> {
    let read_results = fs::read_dir(src);
    match read_results {
        Ok(files) => {
            for entry in files {
                match entry {
                    Ok(entry) => {
                        let ty = entry.file_type().unwrap();
                        if ty.is_dir() {
                            let dir_path = dest.as_ref().join(entry.file_name());
                            let dir_path_str = dir_path.to_str().unwrap();
                            let dir_creation_results = fs::create_dir(dir_path.to_owned());
                            match dir_creation_results {
                                Ok(_) => {}
                                Err(e) => {
                                    if e.raw_os_error().is_some() {
                                        if e.raw_os_error().unwrap() == 183 {
                                            println!("Directory {} already exists", dir_path_str)
                                        }
                                    } else {
                                        info!("[helpers.rs] copy_files: {}", e.to_string());
                                        return Err(e.to_string());
                                    }
                                }
                            }

                            match copy_files(entry.path(), dest.as_ref().join(entry.file_name())) {
                                Ok(_) => {}
                                Err(e) => {
                                    info!("[helpers.rs] copy_files: {}", e.to_string());
                                    return Err(e.to_string());
                                }
                            }
                        } else {
                            let copy_results =
                                fs::copy(entry.path(), dest.as_ref().join(entry.file_name()));
                            match copy_results {
                                Ok(_) => {}
                                Err(e) => {
                                    info!("[helpers.rs] copy_files: {}", e.to_string());
                                    return Err(e.to_string());
                                }
                            }
                        }
                    }
                    Err(e) => {
                        info!("[helpers.rs] copy_files: {}", e.to_string());
                        return Err(e.to_string());
                    }
                }
            }
            return Ok(());
        }
        Err(e) => {
            info!("[helpers.rs] copy_files: {}", e.to_string());
            return Err(e.to_string());
        }
    }
}
