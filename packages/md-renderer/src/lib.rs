use pulldown_cmark::{html, CowStr, Event, Options, Parser};
use wasm_bindgen::prelude::*;

#[wasm_bindgen]
pub fn render_markdown(markdown: &str) -> Result<String, JsValue> {
    let mut options = Options::empty();
    options.insert(Options::ENABLE_TABLES);
    options.insert(Options::ENABLE_FOOTNOTES);
    options.insert(Options::ENABLE_STRIKETHROUGH);
    options.insert(Options::ENABLE_TASKLISTS);
    options.insert(Options::ENABLE_HEADING_ATTRIBUTES);
    options.insert(Options::ENABLE_SMART_PUNCTUATION);

    let parser = Parser::new_ext(markdown, options).map(strip_raw_html);
    let mut output = String::new();
    html::push_html(&mut output, parser);
    Ok(output)
}

fn strip_raw_html(event: Event<'_>) -> Event<'_> {
    match event {
        Event::Html(_) | Event::InlineHtml(_) => Event::Text(CowStr::from("")),
        other => other,
    }
}
