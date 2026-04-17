use image::imageops::FilterType;
use image::{DynamicImage, GenericImageView, ImageFormat, RgbaImage};
use serde::Serialize;
use serde_wasm_bindgen::to_value;
use std::io::Cursor;
use wasm_bindgen::prelude::*;

#[derive(Debug, Serialize)]
pub struct ImageInfo {
    pub width: u32,
    pub height: u32,
    pub format: String,
}

#[wasm_bindgen]
pub fn get_info(data: &[u8]) -> Result<JsValue, JsValue> {
    let image = decode_image(data)?;
    let format = guess_format_name(data);

    to_value(&ImageInfo {
        width: image.width(),
        height: image.height(),
        format,
    })
    .map_err(js_error)
}

#[wasm_bindgen]
pub fn compress(data: &[u8], format: &str, quality: u8) -> Result<Vec<u8>, JsValue> {
    let image = decode_image(data)?;
    encode_image(image, parse_format(format)?, Some(quality))
}

#[wasm_bindgen]
pub fn resize(data: &[u8], width: u32, height: u32, fit: &str) -> Result<Vec<u8>, JsValue> {
    let image = decode_image(data)?;
    let resized = resize_image(image, width, height, fit)?;
    encode_preserving_input_format(resized, data, None)
}

#[wasm_bindgen]
pub fn convert(data: &[u8], to_format: &str, quality: u8) -> Result<Vec<u8>, JsValue> {
    let image = decode_image(data)?;
    encode_image(image, parse_format(to_format)?, Some(quality))
}

#[wasm_bindgen]
pub fn rotate(data: &[u8], degrees: u32) -> Result<Vec<u8>, JsValue> {
    let image = decode_image(data)?;
    let rotated = match degrees % 360 {
        90 => image.rotate90(),
        180 => image.rotate180(),
        270 => image.rotate270(),
        0 => image,
        other => return Err(js_error(format!("unsupported rotation: {other} degrees"))),
    };

    encode_preserving_input_format(rotated, data, None)
}

#[wasm_bindgen]
pub fn flip(data: &[u8], horizontal: bool) -> Result<Vec<u8>, JsValue> {
    let image = decode_image(data)?;
    let flipped = if horizontal {
        image.fliph()
    } else {
        image.flipv()
    };

    encode_preserving_input_format(flipped, data, None)
}

#[wasm_bindgen]
pub fn crop(data: &[u8], x: u32, y: u32, w: u32, h: u32) -> Result<Vec<u8>, JsValue> {
    let image = decode_image(data)?;
    let cropped = crop_image(image, x, y, w, h)?;

    encode_preserving_input_format(cropped, data, None)
}

fn is_heic_data(data: &[u8]) -> bool {
    if data.len() < 12 {
        return false;
    }
    // HEIF/HEIC files start with a ftyp box.
    // Bytes 4-7 contain "ftyp", bytes 8-11 contain the major brand.
    let box_type = &data[4..8];
    let major_brand = &data[8..12];
    if box_type != b"ftyp" {
        return false;
    }
    matches!(major_brand, b"heic" | b"heix" | b"hevc" | b"hevx" | b"heim" | b"heis" | b"hevm" | b"hevs" | b"mif1" | b"msf1")
}

fn decode_heic(data: &[u8]) -> Result<DynamicImage, JsValue> {
    let config = heic::DecoderConfig::new();
    let output = config
        .decode(data, heic::PixelLayout::Rgba8)
        .map_err(|e| js_error(format!("HEIC decode error: {e}")))?;

    let rgba_image = RgbaImage::from_raw(output.width, output.height, output.data)
        .ok_or_else(|| js_error("Failed to create RGBA image from HEIC decode output"))?;

    Ok(DynamicImage::ImageRgba8(rgba_image))
}

fn decode_image(data: &[u8]) -> Result<DynamicImage, JsValue> {
    if is_heic_data(data) {
        return decode_heic(data);
    }
    image::load_from_memory(data).map_err(js_error)
}

fn encode_preserving_input_format(
    image: DynamicImage,
    original_data: &[u8],
    quality: Option<u8>,
) -> Result<Vec<u8>, JsValue> {
    let format = if is_heic_data(original_data) {
        ImageFormat::Png
    } else {
        image::guess_format(original_data).unwrap_or(ImageFormat::Png)
    };
    encode_image(image, format, quality)
}

fn encode_image(
    image: DynamicImage,
    format: ImageFormat,
    quality: Option<u8>,
) -> Result<Vec<u8>, JsValue> {
    let mut buffer = Cursor::new(Vec::new());

    match format {
        ImageFormat::Jpeg => {
            let quality = quality.unwrap_or(80);
            let mut encoder = image::codecs::jpeg::JpegEncoder::new_with_quality(
                &mut buffer,
                quality,
            );
            encoder.encode_image(&image).map_err(js_error)?;
        }
        _ => {
            image
                .write_to(&mut buffer, format)
                .map_err(js_error)?;
        }
    }

    Ok(buffer.into_inner())
}

fn resize_image(image: DynamicImage, width: u32, height: u32, fit: &str) -> Result<DynamicImage, JsValue> {
    if width == 0 || height == 0 {
        return Err(js_error("width and height must be greater than zero"));
    }

    let (src_w, src_h) = image.dimensions();
    if src_w == 0 || src_h == 0 {
        return Err(js_error("input image has invalid dimensions"));
    }

    let fit = fit.trim().to_ascii_lowercase();
    let filter = FilterType::Lanczos3;

    match fit.as_str() {
        "contain" => {
            let scale = (width as f32 / src_w as f32).min(height as f32 / src_h as f32);
            let target_w = ((src_w as f32 * scale).round() as u32).max(1);
            let target_h = ((src_h as f32 * scale).round() as u32).max(1);
            Ok(image.resize(target_w, target_h, filter))
        }
        "cover" => {
            let scale = (width as f32 / src_w as f32).max(height as f32 / src_h as f32);
            let target_w = ((src_w as f32 * scale).round() as u32).max(width);
            let target_h = ((src_h as f32 * scale).round() as u32).max(height);
            let resized = image.resize(target_w, target_h, filter);
            let crop_x = (resized.width().saturating_sub(width)) / 2;
            let crop_y = (resized.height().saturating_sub(height)) / 2;
            Ok(resized.crop_imm(crop_x, crop_y, width, height))
        }
        "exact" => Ok(image.resize_exact(width, height, filter)),
        _ => Err(js_error("fit must be one of: contain, cover, exact")),
    }
}

fn crop_image(image: DynamicImage, x: u32, y: u32, w: u32, h: u32) -> Result<DynamicImage, JsValue> {
    if w == 0 || h == 0 {
        return Err(js_error("crop width and height must be greater than zero"));
    }

    let (src_w, src_h) = image.dimensions();
    let max_x = x
        .checked_add(w)
        .ok_or_else(|| js_error("crop area overflows x bounds"))?;
    let max_y = y
        .checked_add(h)
        .ok_or_else(|| js_error("crop area overflows y bounds"))?;

    if max_x > src_w || max_y > src_h {
        return Err(js_error("crop area exceeds source image bounds"));
    }

    Ok(image.crop_imm(x, y, w, h))
}

fn parse_format(value: &str) -> Result<ImageFormat, JsValue> {
    let normalized = value.trim().to_ascii_lowercase();

    match normalized.as_str() {
        "jpg" | "jpeg" => Ok(ImageFormat::Jpeg),
        "png" => Ok(ImageFormat::Png),
        "webp" => Ok(ImageFormat::WebP),
        "gif" => Ok(ImageFormat::Gif),
        other => Err(js_error(format!("unsupported format: {other}"))),
    }
}

fn guess_format_name(data: &[u8]) -> String {
    if is_heic_data(data) {
        return "heic".to_string();
    }

    match image::guess_format(data) {
        Ok(ImageFormat::Jpeg) => "jpeg".to_string(),
        Ok(ImageFormat::Png) => "png".to_string(),
        Ok(ImageFormat::WebP) => "webp".to_string(),
        Ok(ImageFormat::Gif) => "gif".to_string(),
        Ok(other) => format!("{other:?}").to_ascii_lowercase(),
        Err(_) => "unknown".to_string(),
    }
}

fn js_error(message: impl ToString) -> JsValue {
    JsValue::from_str(&message.to_string())
}
