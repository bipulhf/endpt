# Endpt vs ApiArk Feature Diff

## Scope
This document compares **Endpt** (this repository) against feature claims in the ApiArk README:
- Source reviewed: `https://github.com/berbicanes/apiark/blob/main/README.md`
- Comparison basis for Endpt: current codebase (`src/`, `src-tauri/`) and `README.md`
- Date: 2026-03-20

## What Changed In This Update
- Multi-protocol work in Endpt is now integrated:
  - gRPC (proto import + method discovery + unary calls)
  - WebSocket (connect/send/disconnect + live timeline)
  - SSE (connect/disconnect + live timeline)
- Workspace schema is now protocol-aware (`version: 4`, per-request `protocol` + protocol configs).
- Stream timelines are runtime-only (not persisted in workspace export).

## Executive Summary
- Endpt is now strong in **HTTP + core realtime protocol workflows**.
- ApiArk still claims broader platform scope in automation, interoperability, and extensibility.
- Biggest remaining gaps are around:
  - Additional protocol breadth (MQTT, Socket.IO, gRPC streaming)
  - Automation (runner, scheduling, scripting, reports)
  - Interop (Postman/Insomnia/OpenAPI/HAR/cURL import)
  - Platform add-ons (proxy capture, response diff, plugin/AI ecosystem, CLI)

## Capability Matrix
Legend:
- `✅` Implemented in Endpt
- `🟡` Partial in Endpt
- `❌` Not currently in Endpt

| Capability | ApiArk README claim | Endpt status | Notes for Endpt |
|---|---|---|---|
| Tauri v2 + Rust backend | Yes | ✅ | Present (`src-tauri/`) |
| REST HTTP client | Yes | ✅ | Rust-backed `reqwest` commands |
| GraphQL request mode | Yes | ✅ | GraphQL body mode supported |
| gRPC | Yes | 🟡 | Implemented for unary + proto import; no gRPC streaming; uses `grpcurl` runtime dependency |
| WebSocket | Yes | 🟡 | Core connect/send/disconnect + timeline; advanced binary tooling/filtering not implemented |
| Server-Sent Events | Yes | 🟡 | Core connect/disconnect + timeline; advanced resume/filter controls not implemented |
| MQTT | Yes | ❌ | Not implemented |
| Socket.IO | Yes | ❌ | Not implemented |
| Request auth modes | Yes | ✅ | none/bearer/basic/api-key |
| Rich body modes | Yes | ✅ | json/raw/form-data/urlencoded/binary/graphql |
| Environment variables | Yes | ✅ | Workspace envs + `{{VAR}}` resolver |
| Nested env resolution + cycle checks | Not explicit | ✅ | Implemented in resolver |
| Local-first file model (YAML collections) | Yes | ❌ | Endpt uses workspace JSON model |
| Git-friendly by default | Yes | 🟡 | Exported JSON can be versioned; no default YAML-per-request workflow |
| Import from Postman/Insomnia/etc. | Yes | ❌ | Only Endpt workspace JSON import |
| Collection runner | Yes | ❌ | Not implemented |
| Data-driven runs (CSV/JSON) | Yes | ❌ | Not implemented |
| JUnit/HTML reports | Yes | ❌ | Not implemented |
| Pre/post scripts (`ark.test`) | Yes | ❌ | Not implemented |
| Local mock servers | Yes | ❌ | Not implemented |
| Scheduled monitoring (cron) | Yes | ❌ | Not implemented |
| API docs generation | Yes | ❌ | Not implemented |
| OpenAPI editor/linting | Yes | ❌ | Not implemented |
| Response diff | Yes | ❌ | Not implemented |
| Proxy capture (HTTP/HTTPS MITM) | Yes | ❌ | Not implemented |
| Plugin system (JS/WASM) | Yes | ❌ | Not implemented |
| AI assistant | Yes | ❌ | Not implemented |
| CLI (`apiark run/import`) | Yes | ❌ | No CLI app in this repo |
| i18n / translations | Yes | ❌ | No i18n layer |
| Theme system | Yes | 🟡 | Light/dark/system available, not broad preset/theme-pack scope |
| Resizable desktop layout | Not explicit | ✅ | Implemented via panel layout |
| Auto-update flow | Not explicit | ✅ | Tauri updater integrated |

## Detailed Difference Breakdown

### 1) Protocol Coverage
- Endpt: HTTP/REST + GraphQL-over-HTTP + gRPC unary + WebSocket core + SSE core.
- ApiArk README claims: REST, GraphQL, gRPC, WebSocket, SSE, MQTT, Socket.IO.
- Gap level: **Medium** (reduced from previous high gap).

### 2) Request Lifecycle & Testing Automation
- Endpt: single-request send/call/connect workflows, saved HTTP/gRPC responses, realtime timelines, env substitution.
- ApiArk README claims: scripting hooks, collection runner, data-driven execution, reports, scheduled monitors.
- Gap level: **High**.

### 3) Data Model, Portability, and Migration
- Endpt: workspace JSON import/export, local workspace persistence, protocol-aware schema (`v4`).
- ApiArk README claims: YAML-per-request storage + one-click imports from major tools/formats.
- Gap level: **High**.

### 4) Dev-Tool Platform Features
- Endpt: protocol-aware editor/response views, tabs, environment manager, update checks.
- ApiArk README claims: proxy capture, response diff, local mock servers, plugin system, AI assistant, CLI ecosystem.
- Gap level: **High**.

### 5) UI/UX and Theming
- Endpt: responsive desktop/mobile layout, app topbar, protocol-aware request section, theme toggle.
- ApiArk README claims: broader theme packs and wider platform UX scope.
- Gap level: **Medium**.

## Quantified Gap View
Compared capabilities in this document: **32**
- `✅ Implemented`: **12**
- `🟡 Partial`: **6**
- `❌ Missing`: **14**

## Suggested Parity Roadmap (if target is ApiArk-like breadth)
1. Protocol completion: gRPC streaming, MQTT, Socket.IO.
2. Interop: Postman v2.1 + OpenAPI + cURL/HAR importers.
3. Automation: collection runner + env matrix + reports + scheduling.
4. Platform tooling: response diff + proxy capture + mock servers.
5. Extensibility: plugin API and optional CLI workflow.

## Notes
- ApiArk comparison is based on README claims, not an implementation audit of their repository internals.
- Endpt appears intentionally lean and performance-oriented, now with stronger core multi-protocol support than before.
