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

#[derive(Debug, Serialize, Deserialize, Clone, PartialEq, Eq)]
pub struct GrpcMethodDescriptor {
    pub method_path: String,
    pub service: String,
    pub method: String,
    pub request_type: Option<String>,
    pub response_type: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct GrpcProtoImportResult {
    pub proto_files: Vec<String>,
    pub methods: Vec<GrpcMethodDescriptor>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct GrpcUnaryRequestPayload {
    pub endpoint: String,
    #[serde(default = "default_use_tls", alias = "useTls")]
    pub use_tls: bool,
    #[serde(default, alias = "protoFiles")]
    pub proto_files: Vec<String>,
    #[serde(default, alias = "methodPath")]
    pub method_path: String,
    #[serde(default)]
    pub metadata: HashMap<String, String>,
    #[serde(default, alias = "bodyJson")]
    pub body_json: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct GrpcUnaryResponsePayload {
    pub status_code: i32,
    pub status_text: String,
    pub headers: HashMap<String, String>,
    pub trailers: HashMap<String, String>,
    pub body: String,
    pub elapsed_ms: u64,
    pub size_bytes: u64,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct SessionIdResponse {
    pub session_id: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct WsConnectPayload {
    #[serde(alias = "requestId")]
    pub request_id: String,
    pub url: String,
    #[serde(default)]
    pub headers: HashMap<String, String>,
    #[serde(default)]
    pub subprotocol: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct WsSendPayload {
    #[serde(alias = "sessionId")]
    pub session_id: String,
    pub message: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct WsDisconnectPayload {
    #[serde(alias = "sessionId")]
    pub session_id: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct SseConnectPayload {
    #[serde(alias = "requestId")]
    pub request_id: String,
    pub url: String,
    #[serde(default)]
    pub headers: HashMap<String, String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct SseDisconnectPayload {
    #[serde(alias = "sessionId")]
    pub session_id: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct StreamEventPayload {
    pub request_id: String,
    pub session_id: String,
    pub protocol: String,
    pub direction: String,
    pub timestamp_ms: u64,
    pub payload: String,
    pub event_type: Option<String>,
    pub metadata: Option<HashMap<String, String>>,
}

fn default_use_tls() -> bool {
    true
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

    #[test]
    fn grpc_payload_accepts_camel_case_aliases() {
        let json = serde_json::json!({
            "endpoint": "localhost:50051",
            "useTls": false,
            "protoFiles": ["a.proto"],
            "methodPath": "/svc.Method",
            "metadata": {"x-id": "1"},
            "bodyJson": "{}"
        });

        let payload: GrpcUnaryRequestPayload =
            serde_json::from_value(json).expect("deserialize gRPC payload");

        assert!(!payload.use_tls);
        assert_eq!(payload.proto_files, vec!["a.proto".to_string()]);
        assert_eq!(payload.method_path, "/svc.Method");
    }
}
