use chardet::{charset2encoding, detect};
use charset_normalizer_rs::from_bytes;
use encoding::label::encoding_from_whatwg_label;
use encoding::DecoderTrap;

pub fn decode_buffer(buf: Vec<u8>) -> (String, String, String) {
    let buff_output: String;
    let first_encoding: String;
    let second_encoding: String;
    let mut str_encoding: String;

    // chardet
    first_encoding = charset2encoding(&detect(&buf).0).to_string();

    // charset_normalizer_rs
    second_encoding = from_bytes(&buf, None)
        .get_best()
        .unwrap()
        .encoding()
        .to_string();

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
