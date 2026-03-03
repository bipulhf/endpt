use crate::models::{HttpRequestPayload, HttpResponsePayload};
use reqwest::{Client, Method};
use std::collections::HashMap;
use std::str::FromStr;
use std::time::Instant;

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
        body,
        elapsed_ms,
    })
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
        let parsed = Method::from_str("NOTAMETHOD");
        assert!(parsed.is_err());
    }
}
