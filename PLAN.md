# PLAN.md — postman-lite: High-Performance Desktop API Client

## Overview

**postman-lite** is a blazing-fast, lightweight desktop API client — a Postman/Insomnia alternative — built with Tauri v2 (Rust backend) and React + TypeScript + Vite (frontend). All HTTP traffic is routed through the Rust layer to eliminate CORS restrictions entirely.

## Execution Status

- [x] Phase 1 — Scaffolding & Tooling
- [x] Phase 2 — Rust Backend
- [x] Phase 3 — Frontend Types & State
- [x] Phase 4 — UI Implementation
- [x] Phase 5 — Tests & Final Validation
- [ ] Phase 6 — UI Modernization (light/dark theme, modern components, all body types)

## Validation Results (Phase 1–5)

- [x] TypeScript typecheck passes (`npm run typecheck`)
- [x] Frontend tests pass (`npm run test`)
- [x] Frontend production build passes (inside `npm run tauri build` before Rust compile step)
- [x] Rust compile/test passes (after installing Linux GTK/WebKit prerequisites)
- [x] `npm run tauri dev` launches the app successfully
- [x] Binary runs correctly — confirmed by user

---

## Tech Stack

| Layer | Technology | Version |
|---|---|---|
| Desktop Shell | Tauri | v2.x |
| Backend / Networking | Rust + `reqwest` | `reqwest` 0.12 |
| Frontend Framework | React + TypeScript | React 18, TS 5.x |
| Build Tool | Vite | 5.x |
| Styling | Tailwind CSS | v3.x (pinned, not v4) |
| State Management | Zustand | 4.x |
| Icons | lucide-react | latest |
| Frontend Testing | Vitest + Testing Library | Vitest 1.x |
| Backend Testing | Cargo built-in `#[test]` | — |

---

## Final Project Structure

```
postman-lite/
├── src/
│   ├── components/
│   │   ├── Sidebar.tsx
│   │   ├── RequestEditor.tsx
│   │   ├── ResponsePane.tsx
│   │   └── __tests__/
│   │       ├── setup.ts               # jest-dom matchers setup
│   │       └── store.test.ts          # Zustand store unit tests
│   ├── store/
│   │   └── useWorkspaceStore.ts
│   ├── types/
│   │   └── index.ts
│   ├── services/
│   │   └── ipc.ts
│   ├── App.tsx
│   ├── main.tsx
│   └── index.css
├── src-tauri/
│   ├── src/
│   │   ├── commands/
│   │   │   ├── mod.rs                 # pub mod network; pub mod fs;
│   │   │   ├── network.rs             # make_http_request
│   │   │   └── fs.rs                  # export_workspace, import_workspace
│   │   ├── models/
│   │   │   └── mod.rs                 # HttpRequestPayload, HttpResponsePayload
│   │   ├── lib.rs                     # tauri builder + .invoke_handler(...)
│   │   └── main.rs                    # #![cfg_attr(not(debug))] + fn main()
│   ├── capabilities/
│   │   └── default.json               # Tauri v2 permission grants
│   ├── Cargo.toml
│   └── tauri.conf.json
├── vite.config.ts
├── tailwind.config.js
├── postcss.config.js
├── tsconfig.json
├── tsconfig.node.json
├── package.json
├── AGENTS.md
└── PLAN.md
```

---

## Phase 1 — Scaffolding & Tooling

### 1.1 — Bootstrap the Tauri App

Run from `/media/bipulhf/Drive1/projects/postman-lite/`:

```bash
npm create tauri-app@latest . -- --template react-ts --manager npm
```

This generates `src/`, `src-tauri/`, `vite.config.ts`, `tsconfig.json`, `package.json`, and `tauri.conf.json`.

> **Note:** Answer the interactive prompts: App name = `postman-lite`, window title = `postman-lite`.

### 1.2 — Install Runtime Dependencies

```bash
npm install lucide-react zustand
```

| Package | Purpose |
|---|---|
| `lucide-react` | SVG icon set (folder, plus, send, upload, download icons) |
| `zustand` | Lightweight global state (no Provider boilerplate) |

### 1.3 — Install Dev Dependencies

```bash
npm install -D tailwindcss@^3 postcss autoprefixer
npm install -D vitest @testing-library/react @testing-library/jest-dom jsdom @testing-library/user-event
```

> **Why `tailwindcss@^3`?** Tailwind v4 dropped `tailwind.config.js` and the PostCSS plugin API. Pinning to v3 ensures the standard config works without migration overhead.

### 1.4 — Initialize Tailwind

```bash
npx tailwindcss init -p
```

This creates `tailwind.config.js` and `postcss.config.js`.

**`tailwind.config.js` — exact final content:**

```js
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        surface: {
          900: '#0f1117',
          800: '#161b27',
          700: '#1e2636',
          600: '#252d3d',
        }
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
    },
  },
  plugins: [],
};
```

### 1.5 — `src/index.css` — exact final content

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

/* Scrollbar styling */
::-webkit-scrollbar { width: 6px; height: 6px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: #374151; border-radius: 3px; }
::-webkit-scrollbar-thumb:hover { background: #4b5563; }

body {
  @apply bg-gray-950 text-gray-100 antialiased;
  font-family: 'Inter', system-ui, sans-serif;
  user-select: none;
}

pre, code, textarea.mono {
  font-family: 'JetBrains Mono', 'Fira Code', monospace;
}
```

### 1.6 — `vite.config.ts` — exact final content

```ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],

  // Vitest configuration
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/components/__tests__/setup.ts'],
    css: false,
  },

  // Tauri: use localhost, not 0.0.0.0
  server: {
    port: 1420,
    strictPort: true,
    host: '127.0.0.1',
  },

  // Tauri expects a fixed output directory
  build: {
    outDir: 'dist',
    target: ['es2021', 'chrome100', 'safari13'],
    minify: !process.env.TAURI_DEBUG ? 'esbuild' : false,
    sourcemap: !!process.env.TAURI_DEBUG,
  },

  clearScreen: false,
  envPrefix: ['VITE_', 'TAURI_'],
});
```

### 1.7 — `src/components/__tests__/setup.ts`

```ts
import '@testing-library/jest-dom';
```

---

## Phase 2 — Rust Backend

### 2.1 — `src-tauri/Cargo.toml` — exact final content

```toml
[package]
name = "postman-lite"
version = "0.1.0"
description = "Blazing-fast desktop API client"
authors = ["you"]
edition = "2021"

[lib]
name = "postman_lite_lib"
crate-type = ["staticlib", "cdylib", "rlib"]

[build-dependencies]
tauri-build = { version = "2", features = [] }

[dependencies]
tauri = { version = "2", features = [] }
tauri-plugin-dialog = "2"
tauri-plugin-fs = "2"
serde = { version = "1.0", features = ["derive"] }
serde_json = "1.0"
tokio = { version = "1", features = ["full"] }
reqwest = { version = "0.12", default-features = false, features = ["rustls-tls", "json"] }
# rustls-tls = no system OpenSSL dependency — works on all Linux distros

[profile.release]
opt-level = 3
lto = true
codegen-units = 1
strip = true
panic = "abort"         # Smaller binary: no unwinding tables
```

> **Why `rustls-tls` instead of default `native-tls`?** `native-tls` links against the system's OpenSSL, which differs across distros (and may be absent on fresh Ubuntu). `rustls-tls` bundles the TLS stack in the binary — zero external `.so` dependencies.

### 2.2 — `src-tauri/src/models/mod.rs`

```rust
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

/// Payload sent from the frontend to the `make_http_request` command.
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct HttpRequestPayload {
    pub method: String,
    pub url: String,
    pub headers: HashMap<String, String>,
    pub body: Option<String>,
}

/// Response returned from the `make_http_request` command.
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct HttpResponsePayload {
    pub status: u16,
    pub headers: HashMap<String, String>,
    pub body: String,
    pub elapsed_ms: u64,
    pub size_bytes: u64,
}

// ── Unit Tests ────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_request_payload_serialization_roundtrip() {
        let mut headers = HashMap::new();
        headers.insert("Content-Type".to_string(), "application/json".to_string());

        let payload = HttpRequestPayload {
            method: "POST".to_string(),
            url: "https://example.com/api".to_string(),
            headers,
            body: Some(r#"{"key":"value"}"#.to_string()),
        };

        let json = serde_json::to_string(&payload).expect("serialization failed");
        let restored: HttpRequestPayload =
            serde_json::from_str(&json).expect("deserialization failed");

        assert_eq!(payload.method, restored.method);
        assert_eq!(payload.url, restored.url);
        assert_eq!(payload.body, restored.body);
        assert_eq!(
            payload.headers.get("Content-Type"),
            restored.headers.get("Content-Type")
        );
    }

    #[test]
    fn test_response_payload_fields() {
        let mut headers = HashMap::new();
        headers.insert("x-request-id".to_string(), "abc123".to_string());

        let response = HttpResponsePayload {
            status: 200,
            headers,
            body: r#"{"result":"ok"}"#.to_string(),
            elapsed_ms: 42,
            size_bytes: 15,
        };

        assert_eq!(response.status, 200);
        assert_eq!(response.elapsed_ms, 42);
        assert_eq!(response.size_bytes, 15);
        assert!(response.body.contains("ok"));
    }
}
```

### 2.3 — `src-tauri/src/commands/network.rs`

```rust
use crate::models::{HttpRequestPayload, HttpResponsePayload};
use reqwest::{Client, Method};
use std::collections::HashMap;
use std::str::FromStr;
use std::time::Instant;

/// Tauri command: execute an HTTP request from the Rust layer.
/// This bypasses browser CORS entirely — reqwest runs in native Rust.
#[tauri::command]
pub async fn make_http_request(
    payload: HttpRequestPayload,
) -> Result<HttpResponsePayload, String> {
    let client = Client::builder()
        .danger_accept_invalid_certs(false) // secure by default
        .build()
        .map_err(|e| format!("Failed to build HTTP client: {e}"))?;

    let method =
        Method::from_str(&payload.method.to_uppercase())
            .map_err(|e| format!("Invalid HTTP method '{}': {e}", payload.method))?;

    let mut request_builder = client.request(method, &payload.url);

    // Attach headers
    for (key, value) in &payload.headers {
        request_builder = request_builder.header(key.as_str(), value.as_str());
    }

    // Attach body (only for methods that carry a body)
    if let Some(body_str) = &payload.body {
        if !body_str.trim().is_empty() {
            request_builder = request_builder.body(body_str.clone());
        }
    }

    let start = Instant::now();
    let response = request_builder
        .send()
        .await
        .map_err(|e| format!("Request failed: {e}"))?;
    let elapsed_ms = start.elapsed().as_millis() as u64;

    let status = response.status().as_u16();

    // Collect response headers
    let mut resp_headers: HashMap<String, String> = HashMap::new();
    for (name, value) in response.headers() {
        if let Ok(v) = value.to_str() {
            resp_headers.insert(name.to_string(), v.to_string());
        }
    }

    let body = response
        .text()
        .await
        .map_err(|e| format!("Failed to read response body: {e}"))?;

    let size_bytes = body.len() as u64;

    Ok(HttpResponsePayload {
        status,
        headers: resp_headers,
        body,
        elapsed_ms,
        size_bytes,
    })
}

// ── Unit Tests ────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_payload_with_empty_body_is_valid() {
        let payload = HttpRequestPayload {
            method: "GET".to_string(),
            url: "https://httpbin.org/get".to_string(),
            headers: HashMap::new(),
            body: None,
        };
        // No body — should not panic or produce an error during construction
        assert_eq!(payload.method, "GET");
        assert!(payload.body.is_none());
    }

    #[test]
    fn test_invalid_method_string_is_detected() {
        let result = Method::from_str("NOTAMETHOD");
        assert!(result.is_err(), "Expected invalid method to fail parsing");
    }
}
```

### 2.4 — `src-tauri/src/commands/fs.rs`

```rust
use crate::models::HttpRequestPayload; // reuse serde; workspace uses same JSON
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::fs;

/// Tauri command: write workspace JSON to `path`.
/// The frontend picks the save path using the Tauri dialog plugin first,
/// then passes the resolved absolute path string here.
#[tauri::command]
pub fn export_workspace(path: String, data: Value) -> Result<(), String> {
    let json = serde_json::to_string_pretty(&data)
        .map_err(|e| format!("Serialization error: {e}"))?;

    fs::write(&path, json).map_err(|e| format!("File write error at '{path}': {e}"))
}

/// Tauri command: read workspace JSON from `path`.
/// Returns the parsed JSON `Value` which TypeScript reconstructs into `Workspace`.
#[tauri::command]
pub fn import_workspace(path: String) -> Result<Value, String> {
    let contents =
        fs::read_to_string(&path).map_err(|e| format!("File read error at '{path}': {e}"))?;

    serde_json::from_str(&contents).map_err(|e| format!("JSON parse error: {e}"))
}

// ── Unit Tests ────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;
    use std::env::temp_dir;

    fn temp_path(name: &str) -> String {
        temp_dir().join(name).to_string_lossy().to_string()
    }

    #[test]
    fn test_export_then_import_roundtrip() {
        let path = temp_path("postman_lite_test_workspace.json");
        let original = json!({
            "folders": [
                {
                    "id": "f1",
                    "name": "Auth",
                    "requests": [
                        {
                            "id": "r1",
                            "name": "Login",
                            "method": "POST",
                            "url": "https://api.example.com/login",
                            "headers": [],
                            "body": "{\"user\":\"test\"}"
                        }
                    ]
                }
            ]
        });

        export_workspace(path.clone(), original.clone()).expect("export should succeed");
        let imported = import_workspace(path.clone()).expect("import should succeed");

        assert_eq!(original, imported);

        // Cleanup
        let _ = std::fs::remove_file(&path);
    }

    #[test]
    fn test_import_nonexistent_file_returns_error() {
        let result = import_workspace("/tmp/this_file_does_not_exist_xyz.json".to_string());
        assert!(result.is_err());
        assert!(result.unwrap_err().contains("File read error"));
    }

    #[test]
    fn test_export_to_invalid_path_returns_error() {
        let result = export_workspace(
            "/nonexistent_dir/workspace.json".to_string(),
            json!({"folders": []}),
        );
        assert!(result.is_err());
    }
}
```

### 2.5 — `src-tauri/src/commands/mod.rs`

```rust
pub mod fs;
pub mod network;
```

### 2.6 — `src-tauri/src/models/mod.rs` ← already shown in §2.2 above

### 2.7 — `src-tauri/src/lib.rs`

```rust
mod commands;
mod models;

use commands::{fs::{export_workspace, import_workspace}, network::make_http_request};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .invoke_handler(tauri::generate_handler![
            make_http_request,
            export_workspace,
            import_workspace,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

### 2.8 — `src-tauri/src/main.rs`

```rust
// Prevents an extra console window on Windows in release mode.
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    postman_lite_lib::run();
}
```

### 2.9 — Tauri v2 Permissions: `src-tauri/capabilities/default.json`

Tauri v2 requires explicit capability grants. The default generated file needs these additions:

```json
{
  "$schema": "../gen/schemas/desktop-schema.json",
  "identifier": "default",
  "description": "Default capabilities for postman-lite",
  "windows": ["main"],
  "permissions": [
    "core:default",
    "dialog:allow-open",
    "dialog:allow-save",
    "fs:allow-read-text-file",
    "fs:allow-write-text-file",
    "fs:allow-exists"
  ]
}
```

> **Why these permissions?**
> - `dialog:allow-open` / `dialog:allow-save` → native OS file picker for import/export
> - `fs:allow-read-text-file` / `fs:allow-write-text-file` → read/write workspace JSON
> - `core:default` → standard window/event/IPC permissions

---

## Phase 3 — Frontend Types & State

### 3.1 — `src/types/index.ts` — exact final content

```ts
// HTTP methods supported by the editor
export type HttpMethod =
  | 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS';

// A single key-value header row in the editor
export interface HeaderRow {
  id: string;       // local uuid for React key
  key: string;
  value: string;
  enabled: boolean; // checkbox to include/exclude without deleting
}

// A single saved API request
export interface ApiRequest {
  id: string;
  name: string;
  method: HttpMethod;
  url: string;
  headers: HeaderRow[];
  body: string;     // raw string — user is responsible for valid JSON
}

// A folder that groups requests
export interface Folder {
  id: string;
  name: string;
  collapsed: boolean;   // UI state: is the folder expanded in the sidebar?
  requests: ApiRequest[];
}

// The root workspace saved to disk
export interface Workspace {
  version: number;      // for future migration: currently 1
  folders: Folder[];
}

// What we get back from the Rust make_http_request command
export interface HttpResponse {
  status: number;
  headers: Record<string, string>;
  body: string;
  elapsed_ms: number;
}
```

### 3.2 — `src/store/useWorkspaceStore.ts` — exact final content

```ts
import { create } from 'zustand';
import { ApiRequest, Folder, HttpMethod, Workspace } from '../types';

// ── Helpers ──────────────────────────────────────────────────────────────────

const uuid = () => crypto.randomUUID();

const defaultWorkspace = (): Workspace => ({
  version: 1,
  folders: [],
});

const defaultRequest = (name: string): ApiRequest => ({
  id: uuid(),
  name,
  method: 'GET',
  url: '',
  headers: [],
  body: '',
});

// ── Store Shape ───────────────────────────────────────────────────────────────

interface WorkspaceState {
  workspace: Workspace;
  activeRequestId: string | null;

  // Folder actions
  createFolder: (name: string) => void;
  deleteFolder: (folderId: string) => void;
  renameFolder: (folderId: string, name: string) => void;
  toggleFolderCollapse: (folderId: string) => void;

  // Request actions
  createRequest: (folderId: string, name: string) => void;
  deleteRequest: (folderId: string, requestId: string) => void;
  updateRequest: (requestId: string, partial: Partial<ApiRequest>) => void;

  // Selection
  setActiveRequest: (id: string | null) => void;

  // Active request shortcut (derived)
  getActiveRequest: () => ApiRequest | undefined;

  // Import / Export
  loadWorkspaceFromData: (data: Workspace) => void;
}

// ── Store Implementation ──────────────────────────────────────────────────────

export const useWorkspaceStore = create<WorkspaceState>((set, get) => ({
  workspace: defaultWorkspace(),
  activeRequestId: null,

  createFolder: (name) =>
    set((s) => ({
      workspace: {
        ...s.workspace,
        folders: [
          ...s.workspace.folders,
          { id: uuid(), name, collapsed: false, requests: [] },
        ],
      },
    })),

  deleteFolder: (folderId) =>
    set((s) => ({
      workspace: {
        ...s.workspace,
        folders: s.workspace.folders.filter((f) => f.id !== folderId),
      },
      // Clear active request if it belonged to the deleted folder
      activeRequestId:
        s.workspace.folders
          .find((f) => f.id === folderId)
          ?.requests.some((r) => r.id === s.activeRequestId)
          ? null
          : s.activeRequestId,
    })),

  renameFolder: (folderId, name) =>
    set((s) => ({
      workspace: {
        ...s.workspace,
        folders: s.workspace.folders.map((f) =>
          f.id === folderId ? { ...f, name } : f
        ),
      },
    })),

  toggleFolderCollapse: (folderId) =>
    set((s) => ({
      workspace: {
        ...s.workspace,
        folders: s.workspace.folders.map((f) =>
          f.id === folderId ? { ...f, collapsed: !f.collapsed } : f
        ),
      },
    })),

  createRequest: (folderId, name) => {
    const newReq = defaultRequest(name);
    set((s) => ({
      workspace: {
        ...s.workspace,
        folders: s.workspace.folders.map((f) =>
          f.id === folderId
            ? { ...f, requests: [...f.requests, newReq] }
            : f
        ),
      },
      activeRequestId: newReq.id,
    }));
  },

  deleteRequest: (folderId, requestId) =>
    set((s) => ({
      workspace: {
        ...s.workspace,
        folders: s.workspace.folders.map((f) =>
          f.id === folderId
            ? { ...f, requests: f.requests.filter((r) => r.id !== requestId) }
            : f
        ),
      },
      activeRequestId:
        s.activeRequestId === requestId ? null : s.activeRequestId,
    })),

  updateRequest: (requestId, partial) =>
    set((s) => ({
      workspace: {
        ...s.workspace,
        folders: s.workspace.folders.map((f) => ({
          ...f,
          requests: f.requests.map((r) =>
            r.id === requestId ? { ...r, ...partial } : r
          ),
        })),
      },
    })),

  setActiveRequest: (id) => set({ activeRequestId: id }),

  getActiveRequest: () => {
    const { workspace, activeRequestId } = get();
    for (const folder of workspace.folders) {
      const req = folder.requests.find((r) => r.id === activeRequestId);
      if (req) return req;
    }
    return undefined;
  },

  loadWorkspaceFromData: (data) =>
    set({ workspace: data, activeRequestId: null }),
}));
```

### 3.3 — `src/services/ipc.ts` — exact final content

```ts
import { invoke } from '@tauri-apps/api/core';
import { open, save } from '@tauri-apps/plugin-dialog';
import { ApiRequest, HttpResponse, Workspace } from '../types';

/**
 * Execute an HTTP request via the Rust backend.
 * The request never touches the browser's fetch/XHR stack — zero CORS issues.
 */
export async function executeHttpRequest(request: ApiRequest): Promise<HttpResponse> {
  // Build the flat headers map that Rust expects (only enabled rows)
  const headers: Record<string, string> = {};
  for (const row of request.headers) {
    if (row.enabled && row.key.trim()) {
      headers[row.key.trim()] = row.value;
    }
  }

  return invoke<HttpResponse>('make_http_request', {
    payload: {
      method: request.method,
      url: request.url,
      headers,
      body: request.body.trim() || null,
    },
  });
}

/**
 * Export: show a native "Save As" dialog, then write workspace JSON to disk.
 */
export async function exportData(workspace: Workspace): Promise<void> {
  const path = await save({
    defaultPath: 'workspace.json',
    filters: [{ name: 'JSON', extensions: ['json'] }],
  });

  if (!path) return; // user cancelled

  await invoke('export_workspace', { path, data: workspace });
}

/**
 * Import: show a native "Open" dialog, then read and return the workspace.
 */
export async function importData(): Promise<Workspace | null> {
  const path = await open({
    multiple: false,
    filters: [{ name: 'JSON', extensions: ['json'] }],
  });

  if (!path || Array.isArray(path)) return null;

  const data = await invoke<Workspace>('import_workspace', { path });
  return data;
}
```

---

## Phase 4 — UI Implementation

### Layout Specification

```
┌─────────────────────────────────────────────────────────────────────┐
│ App (h-screen flex flex-row bg-gray-950)                            │
│                                                                     │
│ ┌──────────────────────┐  ┌──────────────────────────────────────┐  │
│ │ Sidebar              │  │ Main Area (flex-1 flex flex-col)     │  │
│ │ w-64 bg-gray-900     │  │                                      │  │
│ │ flex flex-col        │  │ ┌──────────────────────────────────┐ │  │
│ │ border-r             │  │ │ RequestEditor                    │ │  │
│ │ border-gray-800      │  │ │ flex-1 overflow-y-auto           │ │  │
│ │                      │  │ │                                  │ │  │
│ │ [header + actions]   │  │ │ • Method + URL + Send row        │ │  │
│ │                      │  │ │ • Tab bar: Headers | Body        │ │  │
│ │ [folder tree]        │  │ │ • Headers: key/value grid        │ │  │
│ │   ▼ Folder A         │  │ │ • Body: textarea (mono)          │ │  │
│ │     · GET /health    │  │ └──────────────────────────────────┘ │  │
│ │     · POST /login    │  │                                      │  │
│ │   ▶ Folder B         │  │ ┌──────────────────────────────────┐ │  │
│ │                      │  │ │ ResponsePane                     │ │  │
│ │ [Import] [Export]    │  │ │ h-72 border-t border-gray-800    │ │  │
│ └──────────────────────┘  │ │                                  │ │  │
│                           │ │ • Status badge + timing badge    │ │  │
│                           │ │ • Tab bar: Body | Headers        │ │  │
│                           │ │ • <pre> JSON body (scrollable)   │ │  │
│                           │ └──────────────────────────────────┘ │  │
│                           └──────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
```

### 4.1 — `src/App.tsx`

```tsx
import { Sidebar } from './components/Sidebar';
import { RequestEditor } from './components/RequestEditor';
import { ResponsePane } from './components/ResponsePane';
import { useState } from 'react';
import { HttpResponse } from './types';

function App() {
  const [response, setResponse] = useState<HttpResponse | null>(null);
  const [isSending, setIsSending] = useState(false);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-gray-950 text-gray-100">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <RequestEditor
          onResponse={setResponse}
          isSending={isSending}
          setIsSending={setIsSending}
        />
        <ResponsePane response={response} isSending={isSending} />
      </div>
    </div>
  );
}

export default App;
```

### 4.2 — `src/components/Sidebar.tsx` — responsibilities

| UI Element | Behaviour |
|---|---|
| App title bar | Static "postman-lite" label, no drag regions needed |
| "+ New Folder" button | Prompts inline for a folder name (controlled input), calls `createFolder` |
| Folder row | Chevron icon toggles `collapsed`; pencil icon for rename; trash icon for delete |
| Request row inside folder | Shows method badge (colored) + request name; click calls `setActiveRequest` |
| "+ New Request" button | Appears inside each folder row; calls `createRequest(folderId, 'New Request')` |
| Import button | Calls `importData()` from ipc, then calls `loadWorkspaceFromData` on the result |
| Export button | Calls `exportData(workspace)` from ipc |

**Method badge color mapping (Tailwind classes):**

| Method | bg class | text class |
|---|---|---|
| GET | `bg-green-900` | `text-green-400` |
| POST | `bg-blue-900` | `text-blue-400` |
| PUT | `bg-amber-900` | `text-amber-400` |
| PATCH | `bg-purple-900` | `text-purple-400` |
| DELETE | `bg-red-900` | `text-red-400` |
| HEAD | `bg-gray-700` | `text-gray-300` |
| OPTIONS | `bg-gray-700` | `text-gray-300` |

### 4.3 — `src/components/RequestEditor.tsx` — responsibilities

**Props:**
```ts
interface RequestEditorProps {
  onResponse: (r: HttpResponse) => void;
  isSending: boolean;
  setIsSending: (v: boolean) => void;
}
```

**Internal state (React `useState`):**

| State var | Type | Purpose |
|---|---|---|
| `activeTab` | `'headers' \| 'body'` | Controls which tab panel is shown |

**Request flow when "Send" is clicked:**
1. Call `setIsSending(true)`
2. Call `executeHttpRequest(activeRequest)` from `ipc.ts`
3. On success: call `onResponse(result)`, `setIsSending(false)`
4. On error: display error string in a toast/error band, `setIsSending(false)`

**Header editor:** Each `HeaderRow` renders as its own table row: `[checkbox] [key input] [value input] [delete button]`. A "+ Add Header" row at the bottom appends a new blank `HeaderRow` to the active request via `updateRequest`.

**Body editor:** A full-width `<textarea>` with `font-mono`, line numbers optional. Only visible when `activeTab === 'body'`.

### 4.4 — `src/components/ResponsePane.tsx` — responsibilities

**Props:**
```ts
interface ResponsePaneProps {
  response: HttpResponse | null;
  isSending: boolean;
}
```

**Display logic:**

| Condition | What to show |
|---|---|
| `isSending === true` | Spinner / "Sending…" placeholder |
| `response === null && !isSending` | "Hit Send to see a response" placeholder |
| `response !== null` | Status badge + timing + tabbed body/headers |

**Status badge coloring:**

| Range | Color |
|---|---|
| 2xx | `text-green-400 bg-green-900` |
| 3xx | `text-blue-400 bg-blue-900` |
| 4xx | `text-amber-400 bg-amber-900` |
| 5xx | `text-red-400 bg-red-900` |

**Body rendering:** Try `JSON.parse(response.body)` → if valid, render `JSON.stringify(parsed, null, 2)` in a `<pre>` block. If invalid JSON, render as plain text.

---

## Phase 5 — Tests & Final Validation

### 5.1 — `src/components/__tests__/store.test.ts` — exact final content

```ts
import { describe, it, expect, beforeEach } from 'vitest';
import { useWorkspaceStore } from '../../store/useWorkspaceStore';

// Reset store before every test to avoid state bleed
beforeEach(() => {
  useWorkspaceStore.setState({
    workspace: { version: 1, folders: [] },
    activeRequestId: null,
  });
});

describe('createFolder', () => {
  it('adds a folder with the given name', () => {
    useWorkspaceStore.getState().createFolder('Auth');
    const { folders } = useWorkspaceStore.getState().workspace;
    expect(folders).toHaveLength(1);
    expect(folders[0].name).toBe('Auth');
    expect(folders[0].id).toBeTruthy();
    expect(folders[0].collapsed).toBe(false);
  });

  it('adds multiple folders independently', () => {
    useWorkspaceStore.getState().createFolder('Auth');
    useWorkspaceStore.getState().createFolder('Users');
    const { folders } = useWorkspaceStore.getState().workspace;
    expect(folders).toHaveLength(2);
    expect(folders.map((f) => f.name)).toEqual(['Auth', 'Users']);
  });
});

describe('createRequest', () => {
  it('adds a request to the correct folder with default GET method', () => {
    useWorkspaceStore.getState().createFolder('Auth');
    const folder = useWorkspaceStore.getState().workspace.folders[0];
    useWorkspaceStore.getState().createRequest(folder.id, 'Login');

    const updated = useWorkspaceStore.getState().workspace.folders[0];
    expect(updated.requests).toHaveLength(1);
    expect(updated.requests[0].name).toBe('Login');
    expect(updated.requests[0].method).toBe('GET');
  });

  it('sets the new request as active', () => {
    useWorkspaceStore.getState().createFolder('F');
    const folder = useWorkspaceStore.getState().workspace.folders[0];
    useWorkspaceStore.getState().createRequest(folder.id, 'Login');

    const { activeRequestId, workspace } = useWorkspaceStore.getState();
    expect(activeRequestId).toBe(workspace.folders[0].requests[0].id);
  });
});

describe('updateRequest', () => {
  it('merges partial fields without touching other fields', () => {
    useWorkspaceStore.getState().createFolder('F');
    const folder = useWorkspaceStore.getState().workspace.folders[0];
    useWorkspaceStore.getState().createRequest(folder.id, 'Test');

    const req = useWorkspaceStore.getState().workspace.folders[0].requests[0];
    useWorkspaceStore.getState().updateRequest(req.id, {
      method: 'POST',
      url: 'https://example.com',
    });

    const updated = useWorkspaceStore.getState().workspace.folders[0].requests[0];
    expect(updated.method).toBe('POST');
    expect(updated.url).toBe('https://example.com');
    expect(updated.name).toBe('Test'); // untouched
  });
});

describe('loadWorkspaceFromData', () => {
  it('replaces workspace wholesale and clears active request', () => {
    useWorkspaceStore.getState().createFolder('Old Folder');
    const importedWorkspace = {
      version: 1,
      folders: [
        {
          id: 'f-imported',
          name: 'Imported Folder',
          collapsed: false,
          requests: [],
        },
      ],
    };

    useWorkspaceStore.getState().loadWorkspaceFromData(importedWorkspace);

    const { workspace, activeRequestId } = useWorkspaceStore.getState();
    expect(workspace.folders).toHaveLength(1);
    expect(workspace.folders[0].name).toBe('Imported Folder');
    expect(activeRequestId).toBeNull();
  });
});
```

### 5.2 — Rust Tests Summary

Run with: `cd src-tauri && cargo test`

| Test | File | What it verifies |
|---|---|---|
| `test_request_payload_serialization_roundtrip` | `models/mod.rs` | `HttpRequestPayload` survives `to_string` → `from_str` |
| `test_response_payload_fields` | `models/mod.rs` | Fields set correctly on struct literal |
| `test_payload_with_empty_body_is_valid` | `commands/network.rs` | `None` body doesn't panic at construction |
| `test_invalid_method_string_is_detected` | `commands/network.rs` | `Method::from_str("NOTAMETHOD")` returns `Err` |
| `test_export_then_import_roundtrip` | `commands/fs.rs` | Full file write → read → equality check |
| `test_import_nonexistent_file_returns_error` | `commands/fs.rs` | Returns `Err` with "File read error" message |
| `test_export_to_invalid_path_returns_error` | `commands/fs.rs` | Returns `Err` on bad directory path |

### 5.3 — Manual Validation Checklist

```
Phase 1
  [ ] npm run tauri dev starts without errors (Rust compile + Vite HMR)
  [ ] Window appears with correct title "postman-lite"
  [ ] Tailwind dark background visible (not plain white)

Phase 2 / CORS Validation
  [ ] Send GET https://httpbin.org/get → 200 response body displayed
  [ ] Send POST https://httpbin.org/post with body {"test":1} → body echoed back
  [ ] Send GET https://api.github.com/zen → 200 (strict CORS origin)
  [ ] elapsed_ms value is correct and displayed

Phase 3 / State
  [ ] Create folder "Alpha" → appears in sidebar immediately
  [ ] Add request "Get Users" to Alpha → appears in sidebar under Alpha
  [ ] Click request → editor shows the request's fields
  [ ] Change URL, switch to another request, come back → URL persisted

Phase 4 / Persistence
  [ ] Export → native file picker opens → file saved with valid JSON
  [ ] Import the saved file → workspace reloads with same folders/requests
  [ ] Import a malformed JSON file → error message shown, app does not crash

Phase 5 / Build
  [ ] cd src-tauri && cargo test → all 7 tests pass
  [ ] npm run test → all 7 Vitest tests pass
  [ ] npm run tauri build → release binary produced in src-tauri/target/release/
  [ ] Release binary size < 15MB (thanks to lto + strip + panic=abort)
```

---

## Risk & Mitigation

| Risk | Severity | Mitigation |
|---|---|---|
| `reqwest` linking against system OpenSSL fails on some Linux distros | High | Use `rustls-tls` feature: self-contained TLS, no system dep |
| Tauri v2 IPC permission errors at runtime (`Command not found`) | High | Ensure all three commands are in `capabilities/default.json` + registered in `invoke_handler!` |
| Tailwind v4 auto-installed instead of v3 | Medium | Explicitly pin `tailwindcss@^3` in install command |
| `crypto.randomUUID()` unavailable in older WebViews | Medium | Polyfill: `const uuid = () => Math.random().toString(36).slice(2)` as fallback |
| Large response body (>10MB) freezing the UI | Medium | In `ResponsePane`, only render the first 50KB and show a "truncated" warning |
| Import file with wrong schema (missing `folders` key) | Low | In `loadWorkspaceFromData`, validate `data.folders` is an array before loading |
| Windows path separators in `export_workspace` | Low | Rust `std::path::PathBuf` handles this; use `path.to_string_lossy()` not raw string concat |

---

## Implementation Sequence (Step-by-Step)

```
1. npm create tauri-app + npm installs
         │
2. Configure tailwind.config.js + index.css + vite.config.ts
         │
3. Edit src-tauri/Cargo.toml (deps + release profile)
         │
4. Create models/mod.rs
         │
5. Create commands/network.rs
         │
6. Create commands/fs.rs
         │
7. Create commands/mod.rs
         │
8. Edit lib.rs (register commands + plugins)
         │
9. Edit src-tauri/capabilities/default.json (permissions)
         │
10. Create src/types/index.ts
         │
11. Create src/store/useWorkspaceStore.ts
         │
12. Create src/services/ipc.ts
         │
13. Create src/components/__tests__/setup.ts
         │
14. Create src/App.tsx (layout shell)
         │
15. Create src/components/Sidebar.tsx
         │
16. Create src/components/RequestEditor.tsx
         │
17. Create src/components/ResponsePane.tsx
         │
18. Create src/components/__tests__/store.test.ts
         │
19. npm run tauri dev  →  smoke test all features
         │
20. cd src-tauri && cargo test  →  all Rust tests pass
         │
21. npm run test  →  all Vitest tests pass
         │
22. npm run tauri build  →  release binary
```

Estimated focused implementation time: **6–8 hours** for a production-quality v1.

---
---

# Phase 6 — UI Modernization

## Goals

1. **Modern component library** — Replace raw Tailwind markup with **shadcn/ui** (built on **Radix UI** primitives) for accessible, polished, consistent components.
2. **Light & dark mode** — A CSS-variable-based theme system that beautifully supports both modes. Default follows system preference; user can toggle manually.
3. **All request body types** — Expand from JSON-only to: `none`, `JSON`, `raw text`, `XML`, `HTML`, `form-data` (multipart), `x-www-form-urlencoded`, `binary` (file upload), and `GraphQL`.
4. **Better UX** — Resizable panels, tabs for multiple open requests, better visual hierarchy, accessible keyboard navigation, toast notifications for import/export/errors.

---

## Current Baseline (v1 — What Exists Today)

### File Map

```
src/
├── App.tsx                          # Root layout: flex row → Sidebar + (Editor + Response)
├── index.css                        # Tailwind directives, dark-only scrollbar styles
├── main.tsx                         # React DOM root
├── components/
│   ├── Sidebar.tsx                  # Folder tree, import/export, new folder input
│   ├── RequestEditor.tsx            # Method select, URL, headers grid, JSON body textarea
│   ├── ResponsePane.tsx             # Status badge, elapsed_ms, body/headers tabs, fixed h-72
│   └── __tests__/
│       ├── setup.ts                 # jest-dom import
│       └── store.test.ts            # 4 Zustand store tests
├── store/
│   └── useWorkspaceStore.ts         # Zustand: workspace, activeRequestId, CRUD actions
├── types/
│   └── index.ts                     # HttpMethod, HeaderRow, ApiRequest, Folder, Workspace, HttpResponse
└── services/
    └── ipc.ts                       # Tauri invoke wrappers: executeHttpRequest, exportData, importData
```

### Current Limitations (addressed by Phase 6)

| Area | Current State | Target State |
|---|---|---|
| Theme | Dark-only (hardcoded `bg-gray-950`, `text-gray-100`) | Dual light/dark with CSS variables, system-aware + manual toggle |
| Components | Raw Tailwind classes on `<button>`, `<input>`, `<select>` | shadcn/ui `<Button>`, `<Input>`, `<Select>`, `<Tabs>`, `<Dialog>`, etc. |
| Body types | Single `<textarea>` for JSON only | Tab switcher for none/JSON/raw/XML/form-data/x-www-form-urlencoded/binary/GraphQL |
| Response pane | Fixed `h-72`, basic `<pre>` | Resizable with drag handle, syntax-highlighted output, copy button |
| Request tabs | Single active request only | Tabbed interface — multiple requests open simultaneously |
| Notifications | Inline `{error && ...}` text | Toast/Sonner notifications for success/error states |
| Sidebar | Flat action buttons, manual folder input | Search/filter, drag-to-reorder (stretch), context menus |
| Resizing | Fixed sidebar width (w-72) | Draggable panel splitter between sidebar and editor |

---

## New Dependencies

### NPM Install (Runtime)

```bash
npm install @radix-ui/react-slot @radix-ui/react-tabs @radix-ui/react-select \
  @radix-ui/react-dialog @radix-ui/react-dropdown-menu @radix-ui/react-tooltip \
  @radix-ui/react-separator @radix-ui/react-toggle @radix-ui/react-toggle-group \
  @radix-ui/react-scroll-area @radix-ui/react-switch \
  class-variance-authority clsx tailwind-merge \
  sonner react-resizable-panels
```

| Package | Purpose |
|---|---|
| `@radix-ui/*` | Headless accessible primitives (used by shadcn/ui) |
| `class-variance-authority` | Variant-based class composition for components |
| `clsx` + `tailwind-merge` | Utility for merging Tailwind classes without conflicts |
| `sonner` | Beautiful toast notifications |
| `react-resizable-panels` | Draggable panel layout (sidebar ↔ editor ↔ response) |

### NPM Install (Dev)

```bash
npm install -D tailwindcss-animate
```

| Package | Purpose |
|---|---|
| `tailwindcss-animate` | Animation utilities for shadcn/ui transitions |

### No new Rust crates needed

The existing `reqwest` already supports sending arbitrary body bytes. The frontend will serialize form-data/URL-encoded bodies into strings/bytes before sending to Rust. For true multipart form-data with file uploads, we'll add a new Rust command to handle `multipart::Form`.

#### Rust: Add `multipart` feature to `reqwest`

In `src-tauri/Cargo.toml`, update the `reqwest` line:

```toml
reqwest = { version = "0.12", default-features = false, features = ["rustls-tls", "json", "multipart"] }
```

---

## Theme System Design

### Approach: CSS Variables + Tailwind `darkMode: 'class'`

shadcn/ui uses CSS custom properties (HSL values) so every color can flip between light and dark by changing a single class on `<html>`.

### `tailwind.config.js` — Updated

```js
/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
};
```

### `src/index.css` — Updated with CSS Variables

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    /* Light theme (default) */
    --background: 0 0% 100%;
    --foreground: 240 10% 3.9%;
    --card: 0 0% 100%;
    --card-foreground: 240 10% 3.9%;
    --popover: 0 0% 100%;
    --popover-foreground: 240 10% 3.9%;
    --primary: 262 83% 58%;
    --primary-foreground: 0 0% 98%;
    --secondary: 240 4.8% 95.9%;
    --secondary-foreground: 240 5.9% 10%;
    --muted: 240 4.8% 95.9%;
    --muted-foreground: 240 3.8% 46.1%;
    --accent: 240 4.8% 95.9%;
    --accent-foreground: 240 5.9% 10%;
    --destructive: 0 84.2% 60.2%;
    --destructive-foreground: 0 0% 98%;
    --border: 240 5.9% 90%;
    --input: 240 5.9% 90%;
    --ring: 262 83% 58%;
    --radius: 0.5rem;
  }

  .dark {
    --background: 240 10% 3.9%;
    --foreground: 0 0% 98%;
    --card: 240 10% 3.9%;
    --card-foreground: 0 0% 98%;
    --popover: 240 10% 3.9%;
    --popover-foreground: 0 0% 98%;
    --primary: 263 70% 50.4%;
    --primary-foreground: 0 0% 98%;
    --secondary: 240 3.7% 15.9%;
    --secondary-foreground: 0 0% 98%;
    --muted: 240 3.7% 15.9%;
    --muted-foreground: 240 5% 64.9%;
    --accent: 240 3.7% 15.9%;
    --accent-foreground: 0 0% 98%;
    --destructive: 0 62.8% 30.6%;
    --destructive-foreground: 0 0% 98%;
    --border: 240 3.7% 15.9%;
    --input: 240 3.7% 15.9%;
    --ring: 263 70% 50.4%;
  }
}

@layer base {
  * {
    @apply border-border;
  }
  body {
    @apply bg-background text-foreground antialiased;
    font-family: 'Inter', system-ui, sans-serif;
    user-select: none;
  }
}

/* Scrollbar styling — adapts to theme */
::-webkit-scrollbar { width: 6px; height: 6px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { @apply bg-muted-foreground/20 rounded; }
::-webkit-scrollbar-thumb:hover { @apply bg-muted-foreground/40; }

pre, code, textarea.mono {
  font-family: 'JetBrains Mono', 'Fira Code', monospace;
}
```

### Theme Toggle — `src/store/useThemeStore.ts`

```ts
import { create } from 'zustand';

type Theme = 'light' | 'dark' | 'system';

interface ThemeState {
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

const getSystemTheme = (): 'light' | 'dark' => {
  if (typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    return 'dark';
  }
  return 'light';
};

const applyTheme = (theme: Theme): void => {
  const root = document.documentElement;
  const resolved = theme === 'system' ? getSystemTheme() : theme;

  root.classList.remove('light', 'dark');
  root.classList.add(resolved);
  localStorage.setItem('postman-lite-theme', theme);
};

export const useThemeStore = create<ThemeState>((set) => {
  // Initialize from localStorage or default to 'system'
  const saved = (localStorage.getItem('postman-lite-theme') as Theme) || 'system';
  // Apply on store creation
  applyTheme(saved);

  return {
    theme: saved,
    setTheme: (theme) => {
      applyTheme(theme);
      set({ theme });
    },
  };
});
```

### Theme Toggle Component — `src/components/ui/ThemeToggle.tsx`

```tsx
import { Moon, Sun, Monitor } from 'lucide-react';
import { useThemeStore } from '../../store/useThemeStore';

export const ThemeToggle = () => {
  const { theme, setTheme } = useThemeStore();

  const options = [
    { value: 'light' as const, icon: Sun, label: 'Light' },
    { value: 'dark' as const, icon: Moon, label: 'Dark' },
    { value: 'system' as const, icon: Monitor, label: 'System' },
  ];

  return (
    <div className="flex items-center gap-1 rounded-md border border-border bg-muted p-1">
      {options.map(({ value, icon: Icon, label }) => (
        <button
          key={value}
          type="button"
          onClick={() => setTheme(value)}
          className={`rounded-sm p-1.5 transition-colors ${
            theme === value
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
          aria-label={label}
          title={label}
        >
          <Icon size={14} />
        </button>
      ))}
    </div>
  );
};
```

---

## Updated Type System

### `src/types/index.ts` — v2

```ts
// HTTP methods supported by the editor
export type HttpMethod =
  | 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS';

// ── Body Types ────────────────────────────────────────────────────────────────

export type BodyType =
  | 'none'
  | 'json'
  | 'raw'          // plain text, XML, HTML, etc.
  | 'form-data'    // multipart/form-data
  | 'x-www-form-urlencoded'
  | 'binary'       // file upload
  | 'graphql';

export type RawLanguage = 'text' | 'json' | 'xml' | 'html' | 'javascript';

// A single key-value pair for form-data or url-encoded
export interface FormDataRow {
  id: string;
  key: string;
  value: string;
  type: 'text' | 'file';   // for form-data: text value or file path
  enabled: boolean;
}

// GraphQL body shape
export interface GraphQLBody {
  query: string;
  variables: string;  // JSON string
}

// Unified body configuration
export interface RequestBody {
  type: BodyType;
  raw: string;                  // used for json/raw/xml/html
  rawLanguage: RawLanguage;     // sub-type when type === 'raw'
  formData: FormDataRow[];      // used when type === 'form-data'
  urlEncoded: FormDataRow[];    // used when type === 'x-www-form-urlencoded'
  binaryFilePath: string | null;// used when type === 'binary'
  graphql: GraphQLBody;         // used when type === 'graphql'
}

// A single key-value header row in the editor
export interface HeaderRow {
  id: string;
  key: string;
  value: string;
  enabled: boolean;
}

// A single saved API request
export interface ApiRequest {
  id: string;
  name: string;
  method: HttpMethod;
  url: string;
  headers: HeaderRow[];
  body: RequestBody;            // ← was `string`, now structured
}

// A folder that groups requests
export interface Folder {
  id: string;
  name: string;
  collapsed: boolean;
  requests: ApiRequest[];
}

// The root workspace saved to disk
export interface Workspace {
  version: number;   // bump to 2 for body type migration
  folders: Folder[];
}

// What we get back from the Rust make_http_request command
export interface HttpResponse {
  status: number;
  headers: Record<string, string>;
  body: string;
  elapsed_ms: number;
  size_bytes: number;           // NEW — response size
}
```

### Migration Note

When importing a v1 workspace JSON, detect `version: 1` and migrate each request's `body: string` → `body: { type: 'json', raw: <old body>, ... defaults }`. Bump version to 2 on save.

---

## Updated Component Architecture

### New Directory Structure

```
src/
├── components/
│   ├── ui/                           # ← NEW: shadcn/ui-style primitives
│   │   ├── button.tsx
│   │   ├── input.tsx
│   │   ├── select.tsx
│   │   ├── tabs.tsx
│   │   ├── dialog.tsx
│   │   ├── dropdown-menu.tsx
│   │   ├── tooltip.tsx
│   │   ├── separator.tsx
│   │   ├── scroll-area.tsx
│   │   ├── badge.tsx
│   │   ├── card.tsx
│   │   ├── toggle-group.tsx
│   │   ├── switch.tsx
│   │   ├── ThemeToggle.tsx
│   │   └── toaster.tsx              # Sonner wrapper
│   ├── layout/                       # ← NEW: Layout shell
│   │   ├── AppLayout.tsx            # PanelGroup with resizable sidebar + main
│   │   └── TitleBar.tsx             # App name, theme toggle, global actions
│   ├── sidebar/                      # ← Refactored from single file
│   │   ├── Sidebar.tsx              # Sidebar container
│   │   ├── FolderTree.tsx           # Recursive folder/request tree
│   │   ├── SidebarActions.tsx       # Import/Export/New buttons
│   │   └── SearchFilter.tsx         # ← NEW: search/filter requests
│   ├── editor/                       # ← Refactored from single file
│   │   ├── RequestTabs.tsx          # ← NEW: tab bar for open requests
│   │   ├── RequestEditor.tsx        # Main editor (URL bar + body + headers)
│   │   ├── UrlBar.tsx               # ← NEW: method + URL + send (extracted)
│   │   ├── HeadersEditor.tsx        # ← NEW: extracted from RequestEditor
│   │   ├── body/                    # ← NEW: Body type editors
│   │   │   ├── BodyEditor.tsx       # Switcher: renders correct sub-editor
│   │   │   ├── JsonEditor.tsx       # JSON textarea with formatting
│   │   │   ├── RawEditor.tsx        # Plain text with language selector
│   │   │   ├── FormDataEditor.tsx   # Key-value rows with file upload
│   │   │   ├── UrlEncodedEditor.tsx # Key-value rows
│   │   │   ├── BinaryEditor.tsx     # File picker
│   │   │   └── GraphQLEditor.tsx    # Query + variables panes
│   │   └── ParamsEditor.tsx         # ← NEW: query params editor
│   ├── response/                     # ← Refactored from single file
│   │   ├── ResponsePane.tsx         # Container with status bar
│   │   ├── ResponseBody.tsx         # Body viewer with syntax hints
│   │   └── ResponseHeaders.tsx      # Headers table
│   └── __tests__/
│       ├── setup.ts
│       └── store.test.ts            # Updated for new body types
├── store/
│   ├── useWorkspaceStore.ts         # Updated for RequestBody
│   └── useThemeStore.ts             # ← NEW: theme management
├── types/
│   └── index.ts                     # Updated with BodyType, FormDataRow, etc.
├── services/
│   └── ipc.ts                       # Updated to serialize all body types
├── lib/
│   └── utils.ts                     # ← NEW: cn() helper for class merging
├── App.tsx
├── main.tsx
└── index.css                        # Updated with CSS variables for themes
```

### `src/lib/utils.ts` — Class merge utility

```ts
import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

---

## Body Type Implementation Detail

### How each body type maps to the Rust IPC call

| Body Type | Content-Type header (auto-set) | Payload sent to Rust |
|---|---|---|
| `none` | *(no body)* | `body: null` |
| `json` | `application/json` | `body: raw` (string) |
| `raw` (text) | `text/plain` | `body: raw` (string) |
| `raw` (xml) | `application/xml` | `body: raw` (string) |
| `raw` (html) | `text/html` | `body: raw` (string) |
| `raw` (javascript) | `application/javascript` | `body: raw` (string) |
| `x-www-form-urlencoded` | `application/x-www-form-urlencoded` | `body: "key1=val1&key2=val2"` (serialized by frontend) |
| `form-data` | `multipart/form-data` | **New Rust command** `make_multipart_request` — receives parts array |
| `binary` | `application/octet-stream` | **New Rust command** `make_binary_request` — receives file path, Rust reads file |
| `graphql` | `application/json` | `body: JSON.stringify({ query, variables })` |

### New Rust Commands (for multipart & binary)

Add to `src-tauri/src/commands/network.rs`:

```rust
use reqwest::multipart;
use std::path::Path;

/// Form data part descriptor from the frontend.
#[derive(Debug, serde::Deserialize)]
pub struct FormPart {
    pub key: String,
    pub value: String,
    pub part_type: String,  // "text" or "file"
}

/// Tauri command: multipart/form-data request.
#[tauri::command]
pub async fn make_multipart_request(
    method: String,
    url: String,
    headers: std::collections::HashMap<String, String>,
    parts: Vec<FormPart>,
) -> Result<HttpResponsePayload, String> {
    let client = Client::builder()
        .build()
        .map_err(|e| format!("Client build error: {e}"))?;

    let http_method = Method::from_str(&method.to_uppercase())
        .map_err(|e| format!("Invalid method: {e}"))?;

    let mut form = multipart::Form::new();
    for part in parts {
        if part.part_type == "file" {
            let path = Path::new(&part.value);
            let file_name = path.file_name()
                .map(|n| n.to_string_lossy().to_string())
                .unwrap_or_default();
            let bytes = tokio::fs::read(path).await
                .map_err(|e| format!("Failed to read file '{}': {e}", part.value))?;
            let file_part = multipart::Part::bytes(bytes).file_name(file_name);
            form = form.part(part.key, file_part);
        } else {
            form = form.text(part.key, part.value);
        }
    }

    let mut req = client.request(http_method, &url);
    for (k, v) in &headers {
        req = req.header(k.as_str(), v.as_str());
    }
    req = req.multipart(form);

    let start = Instant::now();
    let resp = req.send().await.map_err(|e| format!("Request failed: {e}"))?;
    let elapsed_ms = start.elapsed().as_millis() as u64;
    let status = resp.status().as_u16();

    let mut resp_headers = HashMap::new();
    for (name, value) in resp.headers() {
        if let Ok(v) = value.to_str() {
            resp_headers.insert(name.to_string(), v.to_string());
        }
    }

    let body = resp.text().await.map_err(|e| format!("Body read error: {e}"))?;
    let size_bytes = body.len() as u64;

    Ok(HttpResponsePayload { status, headers: resp_headers, body, elapsed_ms, size_bytes })
}

/// Tauri command: send a file as binary body.
#[tauri::command]
pub async fn make_binary_request(
    method: String,
    url: String,
    headers: std::collections::HashMap<String, String>,
    file_path: String,
) -> Result<HttpResponsePayload, String> {
    let client = Client::builder()
        .build()
        .map_err(|e| format!("Client build error: {e}"))?;

    let http_method = Method::from_str(&method.to_uppercase())
        .map_err(|e| format!("Invalid method: {e}"))?;

    let bytes = tokio::fs::read(&file_path).await
        .map_err(|e| format!("Failed to read file '{}': {e}", file_path))?;

    let mut req = client.request(http_method, &url);
    for (k, v) in &headers {
        req = req.header(k.as_str(), v.as_str());
    }
    req = req.body(bytes);

    let start = Instant::now();
    let resp = req.send().await.map_err(|e| format!("Request failed: {e}"))?;
    let elapsed_ms = start.elapsed().as_millis() as u64;
    let status = resp.status().as_u16();

    let mut resp_headers = HashMap::new();
    for (name, value) in resp.headers() {
        if let Ok(v) = value.to_str() {
            resp_headers.insert(name.to_string(), v.to_string());
        }
    }

    let body = resp.text().await.map_err(|e| format!("Body read error: {e}"))?;
    let size_bytes = body.len() as u64;

    Ok(HttpResponsePayload { status, headers: resp_headers, body, elapsed_ms, size_bytes })
}
```

Register in `lib.rs`:

```rust
.invoke_handler(tauri::generate_handler![
    make_http_request,
    make_multipart_request,   // NEW
    make_binary_request,      // NEW
    export_workspace,
    import_workspace,
])
```

---

## Updated IPC Layer — `src/services/ipc.ts` v2

```ts
import { invoke } from '@tauri-apps/api/core';
import { open, save } from '@tauri-apps/plugin-dialog';
import { ApiRequest, Workspace, HttpResponse, FormDataRow } from '../types';

// ── Body type → Content-Type mapping ──────────────────────────────────────────

const autoContentType = (request: ApiRequest): string | null => {
  switch (request.body.type) {
    case 'json':        return 'application/json';
    case 'graphql':     return 'application/json';
    case 'x-www-form-urlencoded': return 'application/x-www-form-urlencoded';
    case 'binary':      return 'application/octet-stream';
    case 'raw':
      switch (request.body.rawLanguage) {
        case 'json':       return 'application/json';
        case 'xml':        return 'application/xml';
        case 'html':       return 'text/html';
        case 'javascript': return 'application/javascript';
        default:           return 'text/plain';
      }
    default: return null;
  }
};

// ── Build headers (user headers + auto Content-Type) ──────────────────────────

const buildHeaders = (request: ApiRequest): Record<string, string> => {
  const headers: Record<string, string> = {};
  for (const h of request.headers) {
    if (h.enabled && h.key.trim()) headers[h.key.trim()] = h.value;
  }
  // Auto-set Content-Type if user hasn't manually set one
  const ct = autoContentType(request);
  if (ct && !headers['Content-Type'] && !headers['content-type']) {
    headers['Content-Type'] = ct;
  }
  return headers;
};

// ── Execute Request (dispatches by body type) ─────────────────────────────────

export const executeHttpRequest = async (request: ApiRequest): Promise<HttpResponse> => {
  const headers = buildHeaders(request);

  // Form-data → use multipart command
  if (request.body.type === 'form-data') {
    const parts = request.body.formData
      .filter(r => r.enabled && r.key.trim())
      .map(r => ({ key: r.key, value: r.value, part_type: r.type }));
    return invoke<HttpResponse>('make_multipart_request', {
      method: request.method, url: request.url, headers, parts,
    });
  }

  // Binary → use binary command
  if (request.body.type === 'binary' && request.body.binaryFilePath) {
    return invoke<HttpResponse>('make_binary_request', {
      method: request.method, url: request.url, headers,
      filePath: request.body.binaryFilePath,
    });
  }

  // URL-encoded → serialize pairs
  if (request.body.type === 'x-www-form-urlencoded') {
    const encoded = request.body.urlEncoded
      .filter(r => r.enabled && r.key.trim())
      .map(r => `${encodeURIComponent(r.key)}=${encodeURIComponent(r.value)}`)
      .join('&');
    return invoke<HttpResponse>('make_http_request', {
      payload: { method: request.method, url: request.url, headers, body: encoded || null },
    });
  }

  // GraphQL → JSON body
  if (request.body.type === 'graphql') {
    const gqlBody = JSON.stringify({
      query: request.body.graphql.query,
      variables: request.body.graphql.variables
        ? JSON.parse(request.body.graphql.variables)
        : undefined,
    });
    return invoke<HttpResponse>('make_http_request', {
      payload: { method: request.method, url: request.url, headers, body: gqlBody },
    });
  }

  // JSON / Raw / None → use standard command
  const body = request.body.type === 'none' ? null
    : request.body.raw.trim() || null;

  return invoke<HttpResponse>('make_http_request', {
    payload: { method: request.method, url: request.url, headers, body },
  });
};

// export/import unchanged (same as v1)
export const exportData = async (workspace: Workspace): Promise<void> => {
  const path = await save({
    defaultPath: 'workspace.json',
    filters: [{ name: 'JSON', extensions: ['json'] }],
  });
  if (!path) return;
  await invoke('export_workspace', { path, data: workspace });
};

export const importData = async (): Promise<Workspace | null> => {
  const selected = await open({
    multiple: false,
    filters: [{ name: 'JSON', extensions: ['json'] }],
  });
  if (!selected || Array.isArray(selected)) return null;
  const data = await invoke<Workspace>('import_workspace', { path: selected });
  if (!data.folders) throw new Error('Invalid workspace file');
  return data;
};
```

---

## UI Component Specifications

### 6.1 — App Layout (`src/components/layout/AppLayout.tsx`)

Uses `react-resizable-panels`:

```
┌───────────────────────────────────────────────────────────────────┐
│  TitleBar  [ postman-lite ]                        [☀/🌙] [⚙]    │
├────────────┬──────────────────────────────────────────────────────┤
│            │  RequestTabs [ GET /users | POST /login | + ]        │
│  Sidebar   │──────────────────────────────────────────────────────│
│            │  UrlBar  [GET ▼] [https://api.example.com   ] [Send] │
│  Folders   │──────────────────────────────────────────────────────│
│  & Requests│  Params | Headers | Body | Auth                      │
│            │  ┌──────────────────────────────────────────────────┐│
│  [Search]  │  │  Active tab content                              ││
│            │  │  (headers grid / body editor / etc.)              ││
│  ───────── │  └──────────────────────────────────────────────────┘│
│  [Import]  │──────────────────────────────────────────────────────│
│  [Export]  │  Response  ──  Metrics Bar  ─────────────────────────│
│  [+ Folder]│  [200 OK] • Time: 142 ms • Size: 2.14 KB  Body|Hdrs│
│            │  ┌──────────────────────────────────────────────────┐│
│            │  │  {                                     [📋 Copy] ││
│            │  │    "result": "ok"                     [Pretty ▾] ││
│            │  │  }                                               ││
│            │  └──────────────────────────────────────────────────┘│
└────────────┴──────────────────────────────────────────────────────┘
```

- Sidebar: default 260px, min 200px, max 400px, resizable
- Editor/Response: vertical split, resizable
- **Response Metrics Bar**: always visible when a response exists — shows status code (color-coded badge), time taken (ms), and body size (auto-formatted B/KB/MB)

### 6.2 — Body Editor Tabs

The body section shows a tab bar:

```
[ none ] [ json ] [ raw ▾ ] [ form-data ] [ x-www-form-urlencoded ] [ binary ] [ GraphQL ]
```

When `raw` is selected, a secondary dropdown appears: `text | json | xml | html | javascript`

Each tab renders the corresponding sub-component:
- **none**: Empty state message "This request does not have a body"
- **json**: Monospace textarea with auto-indent, JSON validation indicator
- **raw**: Monospace textarea with language selector
- **form-data**: Key/value grid rows with type toggle (text/file), file picker button for file rows
- **x-www-form-urlencoded**: Key/value grid rows (text only)
- **binary**: File picker button + selected file name display
- **GraphQL**: Split pane — query (top) + variables (bottom)

### 6.3 — Response Pane Improvements

- **Resizable** via `react-resizable-panels` vertical split
- **Copy button**: copy response body to clipboard
- **Pretty/Raw toggle**: switch between formatted and raw views
- **Headers table**: proper table with alternating row colors instead of raw JSON

#### Response Metrics Bar

The response pane header displays three key metrics in a horizontal bar, always visible when a response exists:

```
┌────────────────────────────────────────────────────────────────────┐
│  [200 OK]  ●  Time: 142 ms  ●  Size: 2.14 KB    Body | Headers  │
└────────────────────────────────────────────────────────────────────┘
```

| Metric | Source | Display | Color Coding |
|---|---|---|---|
| **Status Code** | `response.status` | Badge with code + text (e.g. `200 OK`, `404 Not Found`) | 2xx = green, 3xx = blue, 4xx = amber, 5xx = red |
| **Time Taken** | `response.elapsed_ms` | `{elapsed_ms} ms` — if > 1000, show as `{seconds}s {ms}ms` | < 200ms = green, 200–1000ms = amber, > 1000ms = red |
| **Body Size** | `response.size_bytes` | Auto-formatted: B / KB / MB (e.g. `2.14 KB`, `1.3 MB`) | Always neutral (muted foreground) |

**Size formatting helper** (in `src/lib/utils.ts`):

```ts
export const formatBytes = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
};
```

**Status text helper** (in `src/lib/utils.ts`):

```ts
const STATUS_TEXT: Record<number, string> = {
  200: 'OK', 201: 'Created', 204: 'No Content',
  301: 'Moved Permanently', 302: 'Found', 304: 'Not Modified',
  400: 'Bad Request', 401: 'Unauthorized', 403: 'Forbidden',
  404: 'Not Found', 405: 'Method Not Allowed', 409: 'Conflict',
  422: 'Unprocessable Entity', 429: 'Too Many Requests',
  500: 'Internal Server Error', 502: 'Bad Gateway', 503: 'Service Unavailable',
};

export const getStatusText = (code: number): string => STATUS_TEXT[code] ?? '';
```

The three metrics are rendered as `<Badge>` components inside the response header bar, using theme-aware semantic colors from the CSS variable system.

---

## Implementation Sequence (Phase 6)

```
 1. npm install new dependencies (Radix, cva, clsx, tailwind-merge, sonner, react-resizable-panels, tailwindcss-animate)
          │
 2. Create src/lib/utils.ts (cn helper)
          │
 3. Update tailwind.config.js (darkMode, CSS variable colors, animate plugin)
          │
 4. Update src/index.css (CSS variables for light + dark themes)
          │
 5. Create src/store/useThemeStore.ts (theme persistence + system detection)
          │
 6. Create src/components/ui/ primitives (button, input, select, tabs, badge, card, etc.)
          │
 7. Update src/types/index.ts (BodyType, FormDataRow, RequestBody, GraphQLBody)
          │
 8. Update src/store/useWorkspaceStore.ts (new body defaults, v1→v2 migration)
          │
 9. Update Cargo.toml (reqwest multipart feature)
          │
10. Add make_multipart_request + make_binary_request to Rust commands
          │
11. Register new commands in lib.rs
          │
12. Update src/services/ipc.ts (body type dispatch logic)
          │
13. Create src/components/layout/TitleBar.tsx + AppLayout.tsx
          │
14. Refactor sidebar → src/components/sidebar/ (Sidebar, FolderTree, SidebarActions, SearchFilter)
          │
15. Create src/components/editor/UrlBar.tsx
          │
16. Create src/components/editor/HeadersEditor.tsx
          │
17. Create src/components/editor/body/ (BodyEditor, JsonEditor, RawEditor, FormDataEditor, UrlEncodedEditor, BinaryEditor, GraphQLEditor)
          │
18. Create src/components/editor/RequestTabs.tsx
          │
19. Create src/components/editor/RequestEditor.tsx (compose all sub-components)
          │
20. Refactor response → src/components/response/ (ResponsePane, ResponseBody, ResponseHeaders)
          │
21. Update src/App.tsx to use AppLayout
          │
22. Update tests for new body types + store changes
          │
23. npm run typecheck → fix any TS errors
          │
24. npm run test → all tests pass
          │
25. npm run tauri dev → visual QA in both light and dark mode
```

Estimated focused implementation time: **8–12 hours** for Phase 6.

---

## Phase 6 Validation Checklist

```
Theme
  [ ] App defaults to system preference (light or dark)
  [ ] Toggle to light → all backgrounds are white/light gray, text is dark
  [ ] Toggle to dark → all backgrounds are dark gray/near-black, text is light
  [ ] Toggle to system → follows OS preference
  [ ] Theme persists across app restarts (localStorage)
  [ ] Scrollbars adapt to theme
  [ ] All components (buttons, inputs, badges, tabs) look correct in both themes

Body Types
  [ ] none → no body sent (Content-Type not auto-added)
  [ ] json → textarea with JSON, Content-Type: application/json
  [ ] raw (text) → textarea, Content-Type: text/plain
  [ ] raw (xml) → textarea, Content-Type: application/xml
  [ ] raw (html) → textarea, Content-Type: text/html
  [ ] form-data → key-value rows, text + file types, multipart request
  [ ] x-www-form-urlencoded → key-value rows, encoded body string
  [ ] binary → file picker, file sent as octet-stream
  [ ] graphql → query + variables, Content-Type: application/json
  [ ] Switching body type preserves data in other types (non-destructive)

UI / UX
  [ ] Sidebar resizable via drag handle
  [ ] Editor ↔ Response pane resizable via drag handle
  [ ] Multiple requests open as tabs
  [ ] Closing a tab switches to the adjacent tab
  [ ] Import/Export still works with v2 workspace format
  [ ] v1 workspace JSON auto-migrates to v2 on import
  [ ] Toast notifications shown for export success, import success, errors
  [ ] Search/filter in sidebar narrows visible requests

Build
  [ ] npm run typecheck passes
  [ ] npm run test passes
  [ ] npm run tauri dev runs without errors
  [ ] npm run tauri build produces optimized binary
```
Estimated focused implementation time: **6–8 hours** for a production-quality v1.
