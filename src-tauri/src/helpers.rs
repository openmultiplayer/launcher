use std::fs;
use std::path::Path;

use chardet::{charset2encoding, detect};
use charset_normalizer_rs::from_bytes;
use encoding::label::encoding_from_whatwg_label;
use encoding::DecoderTrap;
use log::info;

pub fn decode_buffer(buf: Vec<u8>) -> (String, String, String) {
    let buff_output: String;
    let first_encoding: String;
    let second_encoding: String;
    let mut str_encoding: String;

    // chardet
    first_encoding = charset2encoding(&detect(&buf).0).to_string();

    // charset_normalizer_rs
    second_encoding = match from_bytes(&buf, None).get_best() {
        Some(cd) => cd.encoding().to_string(),
        None => "not_found".to_string(),
    };

    str_encoding = first_encoding.clone();

    if first_encoding == "KOI8-R"
        || first_encoding == "MacCyrillic"
        || first_encoding == "x-mac-cyrillic"
    {
        str_encoding = "cp1251".to_string();
    }

    if second_encoding == "koi8-r" || second_encoding == "macintosh" || second_encoding == "ibm866"
    {
        str_encoding = "cp1251".to_string();
    }

    // if str_encoding.len() < 1 {
    //     str_encoding = "cp1251".to_string();
    // }

    let coder = encoding_from_whatwg_label(str_encoding.as_str());
    if coder.is_some() {
        buff_output = coder
            .unwrap()
            .decode(&buf, DecoderTrap::Ignore)
            .expect("Error");
    } else {
        buff_output = String::from_utf8_lossy(buf.as_slice()).to_string();
    }

    (buff_output, first_encoding, second_encoding)
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
