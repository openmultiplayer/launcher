use chardet::{charset2encoding, detect};
use encoding::label::encoding_from_whatwg_label;
use encoding::DecoderTrap;

pub fn decode_buffer(buf: Vec<u8>) -> String {
    let result = detect(&buf);
    let mut str_encoding = charset2encoding(&result.0);
    // let's just say it's cp1251 if encoding is not detected
    // FIXME: find a way to actually detect cp1251 and cp1252 from together

    if result.0 == "MacCyrillic"
        || (result.0 == "KOI8-R" && result.1 < 0.7 && result.2 == "Russian")
    {
        str_encoding = "cp1251";
    }

    if str_encoding.len() < 1 {
        str_encoding = "cp1251";
    }

    let coder = encoding_from_whatwg_label(str_encoding);
    if coder.is_some() {
        coder
            .unwrap()
            .decode(&buf, DecoderTrap::Ignore)
            .expect("Error")
    } else {
        String::from_utf8_lossy(buf.as_slice()).to_string()
    }
}
