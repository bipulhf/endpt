use crate::models::{FormPart, HttpRequestPayload, HttpResponsePayload};
use reqwest::{multipart, Client, Method};
use std::collections::HashMap;
use std::path::Path;
use std::str::FromStr;
use std::time::Instant;

async fn response_payload_from_response(
    response: reqwest::Response,
    elapsed_ms: u64,
) -> Result<HttpResponsePayload, String> {
    let status = response.status().as_u16();
    let mut headers = HashMap::new();

    for (name, value) in response.headers() {
        if let Ok(text) = value.to_str() {
            headers.insert(name.to_string(), text.to_string());
        }
    }

    let body = response
        .text()
        .await
        .map_err(|error| format!("failed to read response body: {error}"))?;

    Ok(HttpResponsePayload {
        status,
        headers,
        size_bytes: body.len() as u64,
        body,
        elapsed_ms,
    })
}

#[tauri::command]
pub async fn make_http_request(payload: HttpRequestPayload) -> Result<HttpResponsePayload, String> {
    let client = Client::builder()
        .build()
        .map_err(|error| format!("failed to build client: {error}"))?;

    let method = Method::from_str(&payload.method.to_uppercase())
        .map_err(|error| format!("invalid method '{}': {error}", payload.method))?;

    let mut request = client.request(method, &payload.url);

    for (key, value) in &payload.headers {
        request = request.header(key, value);
    }

    if let Some(body) = &payload.body {
        if !body.trim().is_empty() {
            request = request.body(body.clone());
        }
    }

    let started = Instant::now();
    let response = request
        .send()
        .await
        .map_err(|error| format!("request failed: {error}"))?;
    let elapsed_ms = started.elapsed().as_millis() as u64;

    response_payload_from_response(response, elapsed_ms).await
}

#[tauri::command]
pub async fn make_multipart_request(
    method: String,
    url: String,
    headers: HashMap<String, String>,
    parts: Vec<FormPart>,
) -> Result<HttpResponsePayload, String> {
    let client = Client::builder()
        .build()
        .map_err(|error| format!("failed to build client: {error}"))?;

    let parsed_method = Method::from_str(&method.to_uppercase())
        .map_err(|error| format!("invalid method '{}': {error}", method))?;

    let mut form = multipart::Form::new();
    for part in parts {
        if part.part_type == "file" {
            let path = Path::new(&part.value);
            let file_name = path
                .file_name()
                .map(|value| value.to_string_lossy().to_string())
                .unwrap_or_default();
            let bytes = tokio::fs::read(path)
                .await
                .map_err(|error| format!("failed to read file '{}': {error}", part.value))?;
            form = form.part(part.key, multipart::Part::bytes(bytes).file_name(file_name));
        } else {
            form = form.text(part.key, part.value);
        }
    }

    let mut request = client.request(parsed_method, &url);
    for (key, value) in &headers {
        request = request.header(key, value);
    }

    let started = Instant::now();
    let response = request
        .multipart(form)
        .send()
        .await
        .map_err(|error| format!("request failed: {error}"))?;
    let elapsed_ms = started.elapsed().as_millis() as u64;

    response_payload_from_response(response, elapsed_ms).await
}

#[tauri::command]
pub async fn make_binary_request(
    method: String,
    url: String,
    headers: HashMap<String, String>,
    file_path: String,
) -> Result<HttpResponsePayload, String> {
    let client = Client::builder()
        .build()
        .map_err(|error| format!("failed to build client: {error}"))?;

    let parsed_method = Method::from_str(&method.to_uppercase())
        .map_err(|error| format!("invalid method '{}': {error}", method))?;

    let bytes = tokio::fs::read(&file_path)
        .await
        .map_err(|error| format!("failed to read file '{}': {error}", file_path))?;

    let mut request = client.request(parsed_method, &url);
    for (key, value) in &headers {
        request = request.header(key, value);
    }

    let started = Instant::now();
    let response = request
        .body(bytes)
        .send()
        .await
        .map_err(|error| format!("request failed: {error}"))?;
    let elapsed_ms = started.elapsed().as_millis() as u64;

    response_payload_from_response(response, elapsed_ms).await
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn empty_body_payload_is_valid() {
        let payload = HttpRequestPayload {
            method: "GET".to_string(),
            url: "https://httpbin.org/get".to_string(),
            headers: HashMap::new(),
            body: None,
        };

        assert_eq!(payload.method, "GET");
        assert!(payload.body.is_none());
    }

    #[test]
    fn invalid_method_is_detected() {
        let parsed = Method::from_str("INV@LID");
        assert!(parsed.is_err());
    }
}
