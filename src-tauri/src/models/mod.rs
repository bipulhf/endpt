use serde::{Deserialize, Serialize};
use std::collections::HashMap;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct HttpRequestPayload {
    pub method: String,
    pub url: String,
    pub headers: HashMap<String, String>,
    pub body: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct HttpResponsePayload {
    pub status: u16,
    pub headers: HashMap<String, String>,
    pub body: String,
    pub elapsed_ms: u64,
    pub size_bytes: u64,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct FormPart {
    pub key: String,
    pub value: String,
    pub part_type: String,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn request_payload_roundtrip() {
        let mut headers = HashMap::new();
        headers.insert("Content-Type".to_string(), "application/json".to_string());

        let payload = HttpRequestPayload {
            method: "POST".to_string(),
            url: "https://example.com/api".to_string(),
            headers,
            body: Some("{\"key\":\"value\"}".to_string()),
        };

        let json = serde_json::to_string(&payload).expect("serialize request payload");
        let restored: HttpRequestPayload =
            serde_json::from_str(&json).expect("deserialize request payload");

        assert_eq!(payload.method, restored.method);
        assert_eq!(payload.url, restored.url);
        assert_eq!(payload.body, restored.body);
        assert_eq!(
            payload.headers.get("Content-Type"),
            restored.headers.get("Content-Type")
        );
    }

    #[test]
    fn response_payload_fields() {
        let mut headers = HashMap::new();
        headers.insert("x-request-id".to_string(), "abc123".to_string());

        let payload = HttpResponsePayload {
            status: 200,
            headers,
            body: "{\"result\":\"ok\"}".to_string(),
            elapsed_ms: 42,
            size_bytes: 15,
        };

        assert_eq!(payload.status, 200);
        assert_eq!(payload.elapsed_ms, 42);
        assert_eq!(payload.size_bytes, 15);
        assert!(payload.body.contains("ok"));
    }
}
