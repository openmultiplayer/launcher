use std::fs;
use std::path::Path;

use chardet::{charset2encoding, detect};
use chardetng::EncodingDetector;
use charset_normalizer_rs::from_bytes;
use encoding_rs::{Encoding, UTF_8};
use log::info;

use crate::constants::*;

/// Decodes a buffer of bytes into a string, detecting the encoding
pub fn decode_buffer(buf: Vec<u8>) -> (String, String) {
    // Using chardetng for encoding detection
    let mut detector = EncodingDetector::new();
    detector.feed(&buf, true);
    let chardetng_encoding = detector.guess(None, true).name().to_lowercase();

    // Using chardet for encoding detection
    let chardet_encoding = charset2encoding(&detect(&buf).0).to_string().to_lowercase();

    // Using charset_normalizer_rs for encoding detection
    let charset_normalizer_encoding = from_bytes(&buf, None)
        .get_best()
        .map(|cd| cd.encoding().to_string().to_lowercase())
        .unwrap_or_else(|| "not_found".to_string());

    // Determine the most likely actual encoding
    let actual_encoding = if chardet_encoding == "ascii" && charset_normalizer_encoding == "ascii" {
        // Default to UTF-8 if both chardet and charset normalizer detect ASCII
        Encoding::for_label("UTF_8".as_bytes()).unwrap_or(UTF_8)
    } else if ((chardet_encoding == "koi8-r" && charset_normalizer_encoding == "koi8-r")
        || chardetng_encoding == "gbk"
            && (chardet_encoding == "windows-1255" || charset_normalizer_encoding == "ibm866"))
        || chardet_encoding == "x-mac-cyrillic"
        || charset_normalizer_encoding == "macintosh"
        || (chardetng_encoding == "iso-8859-2" && chardet_encoding == "iso-8859-1")
    {
        // Use windows-1251 for various combinations
        Encoding::for_label("windows-1251".as_bytes()).unwrap_or(UTF_8)
    } else if chardetng_encoding == "windows-1250"
        && (chardet_encoding == "iso-8859-1" || charset_normalizer_encoding == "windows-1251")
    {
        // Use windows-1250 for various combinations
        Encoding::for_label("windows-1250".as_bytes()).unwrap_or(UTF_8)
    } else if (chardetng_encoding == "windows-1252" && chardet_encoding == "windows-1251")
        || (chardet_encoding == "iso-8859-1"
            && (charset_normalizer_encoding == "iso-8859-2"
                || charset_normalizer_encoding == "windows-874"
                || charset_normalizer_encoding == "iso-8859-1"
                || charset_normalizer_encoding == "ibm866"
                || charset_normalizer_encoding == "euc-kr"))
        || (chardetng_encoding == "shift_jis" && chardet_encoding == "iso-8859-1")
    {
        // Use windows-1252 for various combinations
        Encoding::for_label("windows-1252".as_bytes()).unwrap_or(UTF_8)
    } else if chardetng_encoding == "gbk" || chardet_encoding == "gb2312" {
        // Use GB18030 when chardetng detects GBK or chardet detects GB2312
        Encoding::for_label("GB18030".as_bytes()).unwrap_or(UTF_8)
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

    // Print debug information
    // messages.push(format!("\tfinal: {}", actual_encoding.name().to_string()));
    // for message in messages {
    //     print!("{}", message);
    //     print!("\t");
    // }
    // println!();

    // Return the decoded string and the encoding name
    (buff_output, actual_encoding.name().to_string())
}

pub fn copy_files(src: impl AsRef<Path>, dest: impl AsRef<Path>) -> crate::errors::Result<()> {
    let files = fs::read_dir(src).map_err(|e| crate::errors::LauncherError::from(e))?;

    for entry_result in files {
        let entry = entry_result.map_err(|e| crate::errors::LauncherError::from(e))?;
        let ty = entry
            .file_type()
            .map_err(|e| crate::errors::LauncherError::from(e))?;
        if ty.is_dir() {
            let dir_path = dest.as_ref().join(entry.file_name());

            if let Err(e) = fs::create_dir(&dir_path) {
                match e.raw_os_error() {
                    Some(ERROR_DIRECTORY_EXISTS) => {
                        info!("Directory {} already exists", dir_path.display());
                        return Ok(());
                    }
                    Some(ERROR_ACCESS_DENIED) => {
                        return Err(crate::errors::LauncherError::AccessDenied(format!(
                            "Unable to create the directory \"{}\"",
                            dir_path.display()
                        )))
                    }
                    _ => return Err(crate::errors::LauncherError::from(e)),
                }
            }

            copy_files(entry.path(), dest.as_ref().join(entry.file_name()))?;
        } else {
            let dest_path = dest.as_ref().join(entry.file_name());
            if let Err(e) = fs::copy(entry.path(), dest_path.clone()) {
                match e.raw_os_error() {
                    Some(ERROR_ACCESS_DENIED) => {
                        return Err(crate::errors::LauncherError::AccessDenied(format!(
                            "Unable to copy file from \"{}\" to \"{}\"",
                            entry.path().display(),
                            dest_path.display()
                        )))
                    }
                    _ => return Err(crate::errors::LauncherError::from(e)),
                }
            }
        }
    }

    Ok(())
}
