use crate::models::{
    SessionIdResponse, SseConnectPayload, SseDisconnectPayload, StreamEventPayload,
    WsConnectPayload, WsDisconnectPayload, WsSendPayload,
};
use futures_util::{SinkExt, StreamExt};
use std::collections::HashMap;
use std::sync::Arc;
use std::time::{SystemTime, UNIX_EPOCH};
use tauri::{AppHandle, Emitter, State};
use tokio::sync::{mpsc, Mutex};
use tokio::task::AbortHandle;
use tokio_tungstenite::connect_async;
use tokio_tungstenite::tungstenite::http::{HeaderName, HeaderValue, Request};
use tokio_tungstenite::tungstenite::Message;
use uuid::Uuid;

struct WsSessionHandle {
    request_id: String,
    sender: mpsc::UnboundedSender<Message>,
    read_abort: AbortHandle,
    write_abort: AbortHandle,
}

struct SseSessionHandle {
    request_id: String,
    abort: AbortHandle,
}

#[derive(Clone, Default)]
pub struct RealtimeSessionManager {
    ws_sessions: Arc<Mutex<HashMap<String, WsSessionHandle>>>,
    sse_sessions: Arc<Mutex<HashMap<String, SseSessionHandle>>>,
}

impl RealtimeSessionManager {
    async fn ws_session_ids_for_request(&self, request_id: &str) -> Vec<String> {
        let sessions = self.ws_sessions.lock().await;
        sessions
            .iter()
            .filter(|(_, session)| session.request_id == request_id)
            .map(|(session_id, _)| session_id.clone())
            .collect()
    }

    async fn sse_session_ids_for_request(&self, request_id: &str) -> Vec<String> {
        let sessions = self.sse_sessions.lock().await;
        sessions
            .iter()
            .filter(|(_, session)| session.request_id == request_id)
            .map(|(session_id, _)| session_id.clone())
            .collect()
    }

    async fn insert_ws_session(&self, session_id: String, session: WsSessionHandle) {
        let mut sessions = self.ws_sessions.lock().await;
        sessions.insert(session_id, session);
    }

    async fn remove_ws_session(&self, session_id: &str) -> Option<WsSessionHandle> {
        let mut sessions = self.ws_sessions.lock().await;
        sessions.remove(session_id)
    }

    async fn ws_sender(&self, session_id: &str) -> Option<mpsc::UnboundedSender<Message>> {
        let sessions = self.ws_sessions.lock().await;
        sessions
            .get(session_id)
            .map(|session| session.sender.clone())
    }

    async fn insert_sse_session(&self, session_id: String, session: SseSessionHandle) {
        let mut sessions = self.sse_sessions.lock().await;
        sessions.insert(session_id, session);
    }

    async fn remove_sse_session(&self, session_id: &str) -> Option<SseSessionHandle> {
        let mut sessions = self.sse_sessions.lock().await;
        sessions.remove(session_id)
    }
}

fn current_timestamp_ms() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|duration| duration.as_millis() as u64)
        .unwrap_or(0)
}

fn emit_event(app: &AppHandle, event: StreamEventPayload) {
    let _ = app.emit("stream_event", event);
}

fn status_event(
    request_id: &str,
    session_id: &str,
    protocol: &str,
    payload: &str,
) -> StreamEventPayload {
    StreamEventPayload {
        request_id: request_id.to_string(),
        session_id: session_id.to_string(),
        protocol: protocol.to_string(),
        direction: "status".to_string(),
        timestamp_ms: current_timestamp_ms(),
        payload: payload.to_string(),
        event_type: None,
        metadata: None,
    }
}

fn error_event(
    request_id: &str,
    session_id: &str,
    protocol: &str,
    payload: &str,
) -> StreamEventPayload {
    StreamEventPayload {
        request_id: request_id.to_string(),
        session_id: session_id.to_string(),
        protocol: protocol.to_string(),
        direction: "error".to_string(),
        timestamp_ms: current_timestamp_ms(),
        payload: payload.to_string(),
        event_type: None,
        metadata: None,
    }
}

fn data_event(
    request_id: &str,
    session_id: &str,
    protocol: &str,
    direction: &str,
    payload: String,
    event_type: Option<String>,
) -> StreamEventPayload {
    StreamEventPayload {
        request_id: request_id.to_string(),
        session_id: session_id.to_string(),
        protocol: protocol.to_string(),
        direction: direction.to_string(),
        timestamp_ms: current_timestamp_ms(),
        payload,
        event_type,
        metadata: None,
    }
}

fn normalize_headers(
    raw_headers: &HashMap<String, String>,
) -> Result<Vec<(HeaderName, HeaderValue)>, String> {
    let mut headers = Vec::new();

    for (key, value) in raw_headers {
        let trimmed_key = key.trim();
        if trimmed_key.is_empty() {
            continue;
        }

        let header_name = HeaderName::from_bytes(trimmed_key.as_bytes())
            .map_err(|error| format!("Invalid header name '{trimmed_key}': {error}"))?;
        let header_value = HeaderValue::from_str(value)
            .map_err(|error| format!("Invalid header value for '{trimmed_key}': {error}"))?;

        headers.push((header_name, header_value));
    }

    Ok(headers)
}

fn close_ws_session(session: WsSessionHandle) {
    let _ = session.sender.send(Message::Close(None));
    session.read_abort.abort();
    session.write_abort.abort();
}

fn close_sse_session(session: SseSessionHandle) {
    session.abort.abort();
}

async fn disconnect_existing_ws_for_request(
    manager: &RealtimeSessionManager,
    app: &AppHandle,
    request_id: &str,
) {
    for session_id in manager.ws_session_ids_for_request(request_id).await {
        if let Some(session) = manager.remove_ws_session(&session_id).await {
            close_ws_session(session);
            emit_event(
                app,
                status_event(request_id, &session_id, "websocket", "disconnected"),
            );
        }
    }
}

async fn disconnect_existing_sse_for_request(
    manager: &RealtimeSessionManager,
    app: &AppHandle,
    request_id: &str,
) {
    for session_id in manager.sse_session_ids_for_request(request_id).await {
        if let Some(session) = manager.remove_sse_session(&session_id).await {
            close_sse_session(session);
            emit_event(
                app,
                status_event(request_id, &session_id, "sse", "disconnected"),
            );
        }
    }
}

#[tauri::command]
pub async fn ws_connect(
    app: AppHandle,
    state: State<'_, RealtimeSessionManager>,
    payload: WsConnectPayload,
) -> Result<SessionIdResponse, String> {
    if payload.url.trim().is_empty() {
        return Err("WebSocket URL is required".to_string());
    }

    let manager = state.inner().clone();
    disconnect_existing_ws_for_request(&manager, &app, &payload.request_id).await;

    let mut request_builder = Request::builder().uri(payload.url.clone());
    for (header_name, header_value) in normalize_headers(&payload.headers)? {
        request_builder = request_builder.header(header_name, header_value);
    }

    if let Some(subprotocol) = payload.subprotocol.as_ref() {
        let trimmed = subprotocol.trim();
        if !trimmed.is_empty() {
            request_builder = request_builder.header("Sec-WebSocket-Protocol", trimmed);
        }
    }

    let request = request_builder
        .body(())
        .map_err(|error| format!("Invalid WebSocket request: {error}"))?;

    let (stream, _) = connect_async(request)
        .await
        .map_err(|error| format!("WebSocket connection failed: {error}"))?;

    let session_id = Uuid::new_v4().to_string();
    let request_id = payload.request_id;

    let (mut write_half, mut read_half) = stream.split();
    let (sender, mut receiver) = mpsc::unbounded_channel::<Message>();

    let write_task = tokio::spawn(async move {
        while let Some(message) = receiver.recv().await {
            if write_half.send(message).await.is_err() {
                break;
            }
        }

        let _ = write_half.close().await;
    });

    let app_for_read = app.clone();
    let manager_for_read = manager.clone();
    let session_for_read = session_id.clone();
    let request_for_read = request_id.clone();

    let read_task = tokio::spawn(async move {
        while let Some(next_message) = read_half.next().await {
            match next_message {
                Ok(Message::Text(text)) => {
                    emit_event(
                        &app_for_read,
                        data_event(
                            &request_for_read,
                            &session_for_read,
                            "websocket",
                            "inbound",
                            text.to_string(),
                            None,
                        ),
                    );
                }
                Ok(Message::Binary(binary)) => {
                    emit_event(
                        &app_for_read,
                        data_event(
                            &request_for_read,
                            &session_for_read,
                            "websocket",
                            "inbound",
                            String::from_utf8_lossy(&binary).to_string(),
                            Some("binary".to_string()),
                        ),
                    );
                }
                Ok(Message::Close(frame)) => {
                    let payload = frame
                        .as_ref()
                        .map(|value| value.reason.to_string())
                        .unwrap_or_else(|| "disconnected".to_string());
                    emit_event(
                        &app_for_read,
                        status_event(&request_for_read, &session_for_read, "websocket", &payload),
                    );
                    break;
                }
                Ok(_) => {}
                Err(error) => {
                    emit_event(
                        &app_for_read,
                        error_event(
                            &request_for_read,
                            &session_for_read,
                            "websocket",
                            &error.to_string(),
                        ),
                    );
                    break;
                }
            }
        }

        if let Some(session) = manager_for_read.remove_ws_session(&session_for_read).await {
            session.write_abort.abort();
        }

        emit_event(
            &app_for_read,
            status_event(
                &request_for_read,
                &session_for_read,
                "websocket",
                "disconnected",
            ),
        );
    });

    manager
        .insert_ws_session(
            session_id.clone(),
            WsSessionHandle {
                request_id: request_id.clone(),
                sender,
                read_abort: read_task.abort_handle(),
                write_abort: write_task.abort_handle(),
            },
        )
        .await;

    emit_event(
        &app,
        status_event(&request_id, &session_id, "websocket", "connected"),
    );

    Ok(SessionIdResponse { session_id })
}

#[tauri::command]
pub async fn ws_send(
    app: AppHandle,
    state: State<'_, RealtimeSessionManager>,
    payload: WsSendPayload,
) -> Result<(), String> {
    let manager = state.inner().clone();
    let sender = manager
        .ws_sender(&payload.session_id)
        .await
        .ok_or_else(|| "WebSocket session not found".to_string())?;

    sender
        .send(Message::Text(payload.message.clone().into()))
        .map_err(|_| "Failed to queue WebSocket message".to_string())?;

    let request_id = {
        let sessions = manager.ws_sessions.lock().await;
        sessions
            .get(&payload.session_id)
            .map(|session| session.request_id.clone())
            .unwrap_or_default()
    };

    if !request_id.is_empty() {
        emit_event(
            &app,
            data_event(
                &request_id,
                &payload.session_id,
                "websocket",
                "outbound",
                payload.message,
                None,
            ),
        );
    }

    Ok(())
}

#[tauri::command]
pub async fn ws_disconnect(
    app: AppHandle,
    state: State<'_, RealtimeSessionManager>,
    payload: WsDisconnectPayload,
) -> Result<(), String> {
    if let Some(session) = state.inner().remove_ws_session(&payload.session_id).await {
        let request_id = session.request_id.clone();
        close_ws_session(session);
        emit_event(
            &app,
            status_event(
                &request_id,
                &payload.session_id,
                "websocket",
                "disconnected",
            ),
        );
    }

    Ok(())
}

fn flush_sse_event(
    app: &AppHandle,
    request_id: &str,
    session_id: &str,
    event_type: &mut Option<String>,
    data_lines: &mut Vec<String>,
) {
    if data_lines.is_empty() {
        return;
    }

    let payload = data_lines.join("\n");
    let event_name = event_type.take();

    emit_event(
        app,
        data_event(
            request_id, session_id, "sse", "inbound", payload, event_name,
        ),
    );

    data_lines.clear();
}

#[tauri::command]
pub async fn sse_connect(
    app: AppHandle,
    state: State<'_, RealtimeSessionManager>,
    payload: SseConnectPayload,
) -> Result<SessionIdResponse, String> {
    if payload.url.trim().is_empty() {
        return Err("SSE URL is required".to_string());
    }

    let manager = state.inner().clone();
    disconnect_existing_sse_for_request(&manager, &app, &payload.request_id).await;

    let session_id = Uuid::new_v4().to_string();
    let request_id = payload.request_id;
    let url = payload.url;
    let headers = normalize_headers(&payload.headers)?;

    let app_for_stream = app.clone();
    let manager_for_stream = manager.clone();
    let session_for_stream = session_id.clone();
    let request_for_stream = request_id.clone();

    let stream_task = tokio::spawn(async move {
        let client = reqwest::Client::new();
        let mut request_builder = client.get(url);
        for (name, value) in headers {
            request_builder = request_builder.header(name, value);
        }

        let response = match request_builder.send().await {
            Ok(response) => response,
            Err(error) => {
                emit_event(
                    &app_for_stream,
                    error_event(
                        &request_for_stream,
                        &session_for_stream,
                        "sse",
                        &error.to_string(),
                    ),
                );
                let _ = manager_for_stream
                    .remove_sse_session(&session_for_stream)
                    .await;
                return;
            }
        };

        if !response.status().is_success() {
            emit_event(
                &app_for_stream,
                error_event(
                    &request_for_stream,
                    &session_for_stream,
                    "sse",
                    &format!("SSE connection failed with status {}", response.status()),
                ),
            );
            let _ = manager_for_stream
                .remove_sse_session(&session_for_stream)
                .await;
            return;
        }

        emit_event(
            &app_for_stream,
            status_event(&request_for_stream, &session_for_stream, "sse", "connected"),
        );

        let mut buffer = String::new();
        let mut event_type: Option<String> = None;
        let mut data_lines: Vec<String> = Vec::new();

        let mut stream = response.bytes_stream();
        while let Some(chunk) = stream.next().await {
            match chunk {
                Ok(bytes) => {
                    buffer.push_str(&String::from_utf8_lossy(&bytes));

                    while let Some(newline_index) = buffer.find('\n') {
                        let mut line = buffer.drain(..=newline_index).collect::<String>();
                        if line.ends_with('\n') {
                            line.pop();
                        }
                        if line.ends_with('\r') {
                            line.pop();
                        }

                        if line.is_empty() {
                            flush_sse_event(
                                &app_for_stream,
                                &request_for_stream,
                                &session_for_stream,
                                &mut event_type,
                                &mut data_lines,
                            );
                            continue;
                        }

                        if line.starts_with(':') {
                            continue;
                        }

                        let (field, value) = match line.split_once(':') {
                            Some((field, value)) => (field.trim(), value.trim_start()),
                            None => (line.trim(), ""),
                        };

                        match field {
                            "event" => event_type = Some(value.to_string()),
                            "data" => data_lines.push(value.to_string()),
                            _ => {}
                        }
                    }
                }
                Err(error) => {
                    emit_event(
                        &app_for_stream,
                        error_event(
                            &request_for_stream,
                            &session_for_stream,
                            "sse",
                            &error.to_string(),
                        ),
                    );
                    break;
                }
            }
        }

        flush_sse_event(
            &app_for_stream,
            &request_for_stream,
            &session_for_stream,
            &mut event_type,
            &mut data_lines,
        );

        let _ = manager_for_stream
            .remove_sse_session(&session_for_stream)
            .await;
        emit_event(
            &app_for_stream,
            status_event(
                &request_for_stream,
                &session_for_stream,
                "sse",
                "disconnected",
            ),
        );
    });

    manager
        .insert_sse_session(
            session_id.clone(),
            SseSessionHandle {
                request_id: request_id.clone(),
                abort: stream_task.abort_handle(),
            },
        )
        .await;

    Ok(SessionIdResponse { session_id })
}

#[tauri::command]
pub async fn sse_disconnect(
    app: AppHandle,
    state: State<'_, RealtimeSessionManager>,
    payload: SseDisconnectPayload,
) -> Result<(), String> {
    if let Some(session) = state.inner().remove_sse_session(&payload.session_id).await {
        let request_id = session.request_id.clone();
        close_sse_session(session);
        emit_event(
            &app,
            status_event(&request_id, &payload.session_id, "sse", "disconnected"),
        );
    }

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn normalizes_headers_and_skips_empty_keys() {
        let mut headers = HashMap::new();
        headers.insert("Authorization".to_string(), "Bearer token".to_string());
        headers.insert("   ".to_string(), "ignored".to_string());

        let normalized = normalize_headers(&headers).expect("normalize headers");
        assert_eq!(normalized.len(), 1);
        assert_eq!(normalized[0].0.as_str(), "authorization");
    }
}
