use crate::models::{
    GrpcMethodDescriptor, GrpcProtoImportResult, GrpcUnaryRequestPayload, GrpcUnaryResponsePayload,
};
use regex::Regex;
use std::collections::{HashMap, HashSet};
use std::path::{Path, PathBuf};
use std::time::Instant;
use tokio::process::Command;

fn strip_proto_comments(content: &str) -> String {
    let block_comments = Regex::new(r"(?s)/\*.*?\*/").expect("block comment regex");
    let line_comments = Regex::new(r"(?m)//.*$").expect("line comment regex");

    let without_blocks = block_comments.replace_all(content, "");
    line_comments.replace_all(&without_blocks, "").to_string()
}

fn parse_proto_methods(content: &str) -> Vec<GrpcMethodDescriptor> {
    let package_regex =
        Regex::new(r"(?m)^\s*package\s+([A-Za-z_][A-Za-z0-9_.]*)\s*;").expect("package regex");
    let service_regex =
        Regex::new(r"(?s)service\s+([A-Za-z_][A-Za-z0-9_]*)\s*\{(.*?)\}").expect("service regex");
    let rpc_regex = Regex::new(
        r"rpc\s+([A-Za-z_][A-Za-z0-9_]*)\s*\(\s*([.A-Za-z_][A-Za-z0-9_.]*)\s*\)\s*returns\s*\(\s*([.A-Za-z_][A-Za-z0-9_.]*)\s*\)\s*;",
    )
    .expect("rpc regex");

    let package_name = package_regex
        .captures(content)
        .and_then(|captures| captures.get(1).map(|value| value.as_str().to_string()));

    let mut methods = Vec::new();
    for service_capture in service_regex.captures_iter(content) {
        let service_name = service_capture
            .get(1)
            .map(|value| value.as_str().to_string())
            .unwrap_or_default();
        let block = service_capture
            .get(2)
            .map(|value| value.as_str())
            .unwrap_or("");

        let service_full_name = match &package_name {
            Some(package) if !package.is_empty() => format!("{package}.{service_name}"),
            _ => service_name.clone(),
        };

        for rpc_capture in rpc_regex.captures_iter(block) {
            let method = rpc_capture
                .get(1)
                .map(|value| value.as_str().to_string())
                .unwrap_or_default();
            let request_type = rpc_capture
                .get(2)
                .map(|value| value.as_str().to_string())
                .filter(|value| !value.is_empty());
            let response_type = rpc_capture
                .get(3)
                .map(|value| value.as_str().to_string())
                .filter(|value| !value.is_empty());

            methods.push(GrpcMethodDescriptor {
                method_path: format!("/{service_full_name}/{method}"),
                service: service_full_name.clone(),
                method,
                request_type,
                response_type,
            });
        }
    }

    methods
}

fn normalize_proto_paths(paths: &[String]) -> Result<Vec<String>, String> {
    if paths.is_empty() {
        return Err("At least one .proto file is required".to_string());
    }

    let mut normalized = Vec::new();
    for raw_path in paths {
        let path = PathBuf::from(raw_path);

        if path.extension().and_then(|value| value.to_str()) != Some("proto") {
            return Err(format!("'{raw_path}' is not a .proto file"));
        }

        if !path.exists() {
            return Err(format!("Proto file not found: {raw_path}"));
        }

        let canonical = path
            .canonicalize()
            .map_err(|error| format!("Failed to resolve '{raw_path}': {error}"))?;

        normalized.push(canonical.to_string_lossy().to_string());
    }

    Ok(normalized)
}

fn collect_methods(proto_files: &[String]) -> Result<Vec<GrpcMethodDescriptor>, String> {
    let mut seen = HashSet::new();
    let mut methods = Vec::new();

    for proto_file in proto_files {
        let contents = std::fs::read_to_string(proto_file)
            .map_err(|error| format!("Failed to read proto file '{proto_file}': {error}"))?;
        let cleaned = strip_proto_comments(&contents);

        for method in parse_proto_methods(&cleaned) {
            if seen.insert(method.method_path.clone()) {
                methods.push(method);
            }
        }
    }

    methods.sort_by(|left, right| left.method_path.cmp(&right.method_path));
    Ok(methods)
}

fn extract_import_paths(proto_files: &[String]) -> Vec<String> {
    let mut seen = HashSet::new();
    let mut import_paths = Vec::new();

    for proto_file in proto_files {
        if let Some(parent) = Path::new(proto_file).parent() {
            let text = parent.to_string_lossy().to_string();
            if seen.insert(text.clone()) {
                import_paths.push(text);
            }
        }
    }

    import_paths
}

#[tauri::command]
pub fn import_proto_files(paths: Vec<String>) -> Result<GrpcProtoImportResult, String> {
    let proto_files = normalize_proto_paths(&paths)?;
    let methods = collect_methods(&proto_files)?;

    Ok(GrpcProtoImportResult {
        proto_files,
        methods,
    })
}

#[tauri::command]
pub fn list_grpc_methods(proto_files: Vec<String>) -> Result<Vec<GrpcMethodDescriptor>, String> {
    let normalized = normalize_proto_paths(&proto_files)?;
    collect_methods(&normalized)
}

#[tauri::command]
pub async fn call_grpc_unary(
    payload: GrpcUnaryRequestPayload,
) -> Result<GrpcUnaryResponsePayload, String> {
    if payload.endpoint.trim().is_empty() {
        return Err("gRPC endpoint is required".to_string());
    }

    if payload.method_path.trim().is_empty() {
        return Err("gRPC method path is required".to_string());
    }

    let normalized_proto_files = normalize_proto_paths(&payload.proto_files)?;
    let methods = collect_methods(&normalized_proto_files)?;

    if !methods
        .iter()
        .any(|method| method.method_path == payload.method_path)
    {
        return Err(format!(
            "Method '{}' not found in imported proto files",
            payload.method_path
        ));
    }

    let body_json = if payload.body_json.trim().is_empty() {
        "{}".to_string()
    } else {
        serde_json::from_str::<serde_json::Value>(&payload.body_json)
            .map_err(|error| format!("Invalid gRPC JSON payload: {error}"))?;
        payload.body_json.clone()
    };

    let mut command = Command::new("grpcurl");

    if !payload.use_tls {
        command.arg("-plaintext");
    }

    for import_path in extract_import_paths(&normalized_proto_files) {
        command.arg("-import-path").arg(import_path);
    }

    for proto_file in &normalized_proto_files {
        command.arg("-proto").arg(proto_file);
    }

    for (key, value) in payload.metadata {
        let key = key.trim();
        if key.is_empty() {
            continue;
        }
        command.arg("-H").arg(format!("{key}: {value}"));
    }

    let grpc_method = payload
        .method_path
        .trim()
        .trim_start_matches('/')
        .to_string();
    command
        .arg("-d")
        .arg(body_json)
        .arg(payload.endpoint)
        .arg(grpc_method);

    let started = Instant::now();
    let output = command.output().await.map_err(|error| {
        if error.kind() == std::io::ErrorKind::NotFound {
            "grpcurl is not installed or not available in PATH".to_string()
        } else {
            format!("Failed to execute grpcurl: {error}")
        }
    })?;
    let elapsed_ms = started.elapsed().as_millis() as u64;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr).trim().to_string();
        let stdout = String::from_utf8_lossy(&output.stdout).trim().to_string();
        let message = if !stderr.is_empty() {
            stderr
        } else if !stdout.is_empty() {
            stdout
        } else {
            "Unknown grpcurl execution error".to_string()
        };

        return Err(format!("gRPC unary call failed: {message}"));
    }

    let stdout = String::from_utf8_lossy(&output.stdout).trim().to_string();
    let body = if stdout.is_empty() {
        "{}".to_string()
    } else {
        stdout
    };

    Ok(GrpcUnaryResponsePayload {
        status_code: 0,
        status_text: "OK".to_string(),
        headers: HashMap::new(),
        trailers: HashMap::new(),
        size_bytes: body.len() as u64,
        body,
        elapsed_ms,
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parses_proto_service_methods() {
        let source = r#"
            syntax = "proto3";
            package users.v1;

            service UserService {
                rpc GetUser(GetUserRequest) returns (GetUserResponse);
                rpc CreateUser(CreateUserRequest) returns (CreateUserResponse);
            }
        "#;

        let methods = parse_proto_methods(source);

        assert_eq!(methods.len(), 2);
        assert_eq!(methods[0].method_path, "/users.v1.UserService/GetUser");
        assert_eq!(methods[1].method_path, "/users.v1.UserService/CreateUser");
    }

    #[test]
    fn strips_comments_before_parsing() {
        let source = r#"
            // package fake;
            package ping;
            /* service Ignored {
                rpc Nope(NopeRequest) returns (NopeResponse);
            } */
            service Ping {
                rpc Health(HealthRequest) returns (HealthResponse);
            }
        "#;

        let methods = parse_proto_methods(&strip_proto_comments(source));
        assert_eq!(methods.len(), 1);
        assert_eq!(methods[0].method_path, "/ping.Ping/Health");
    }
}
