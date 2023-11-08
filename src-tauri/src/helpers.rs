use chardet::{charset2encoding, detect};
use encoding::label::encoding_from_whatwg_label;
use encoding::DecoderTrap;

pub fn decode_buffer(buf: Vec<u8>) -> String {
    let result = detect(&buf);
    let coder = encoding_from_whatwg_label(charset2encoding(&result.0));
    if coder.is_some() {
        coder
            .unwrap()
            .decode(&buf, DecoderTrap::Ignore)
            .expect("Error")
    } else {
        String::from_utf8_lossy(buf.as_slice()).to_string()
    }
}
