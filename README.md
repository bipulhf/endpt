# Endpt

[![Release](https://img.shields.io/github/v/release/bipulhf/endpt?label=release)](https://github.com/bipulhf/endpt/releases)
[![Build](https://github.com/bipulhf/endpt/actions/workflows/release.yml/badge.svg)](https://github.com/bipulhf/endpt/actions/workflows/release.yml)
[![License](https://img.shields.io/github/license/bipulhf/endpt)](LICENSE)

<img src="main_logo.png" alt="Endpt Logo" width="100" height="100">

A high-performance, lightweight desktop API client built with **Tauri v2**, **React**, **TypeScript**, and **Rust**. Designed as a blazing-fast alternative to Postman and Insomnia for Linux, Windows, and macOS.

## Overview

Endpt executes all HTTP requests through a Rust backend powered by `reqwest`, bypassing browser webview CORS restrictions and delivering consistent, native-level networking across every platform. The frontend is a responsive React + Tailwind CSS interface with resizable panels, theme support, and a modular component architecture.

## Screenshot

![Endpt Screenshot](app_ss.png)

## Features

- **Rust-powered networking** — all requests run via `reqwest` in the Tauri backend, no CORS issues
- **Workspace model** — organize endpoints into folders with drag-free rename and search/filter
- **Full request editor** — method selector, URL bar, query params, headers, auth, and body
- **7 body modes** — none, JSON, raw (text/json/xml/html/javascript), form-data (text + file), x-www-form-urlencoded, binary file, GraphQL (query + variables)
- **Authentication** — Bearer token, Basic auth, API key (header or query)
- **Response pane** — status code, duration (ms), size (bytes), pretty/raw toggle, copy to clipboard, collapsible JSON tree
- **Tabbed editing** — open multiple requests as tabs, close/switch freely
- **Import/export** — save and load workspace JSON files through native Rust file dialogs
- **Theme support** — light, dark, and system modes
- **Resizable panels** — drag to resize sidebar, editor, and response panes
- **Auto-update** — built-in update checker notifies when a new release is available
- **Responsive layout** — adapts from desktop to small window sizes with a mobile-friendly sidebar toggle

## Tech Stack

### Frontend

- React 19 + TypeScript 5
- Vite 7
- Tailwind CSS 3
- Zustand (state management)
- Sonner (toast notifications)
- Radix UI primitives (select, badge, button, input)
- react-resizable-panels
- Lucide React (icons)

### Backend

- Tauri v2
- Rust (stable)
- reqwest (HTTP client)
- tokio (async runtime)
- serde / serde_json (serialization)

### Testing

- Vitest + Testing Library (frontend)
- cargo test (backend)

## Project Structure

```text
src/
├── App.tsx                        # Root layout with resizable panels + mobile view
├── main.tsx                       # React entry point
├── index.css                      # Tailwind directives + custom theme tokens
├── constants/
│   └── methods.ts                 # Shared HTTP method color maps and list
├── lib/
│   └── utils.ts                   # cn(), createId(), formatBytes(), getStatusText()
├── components/
│   ├── RequestEditor.tsx          # URL bar, method selector, tab switcher
│   ├── HeadersEditor.tsx          # Key-value header grid (mobile + desktop)
│   ├── BodyEditor.tsx             # 7 body type UIs (JSON, raw, form-data, etc.)
│   ├── AuthEditor.tsx             # Bearer / Basic / API-key auth forms
│   ├── ParamsEditor.tsx           # Query parameter key-value editor
│   ├── ResponsePane.tsx           # Status, timing, size, pretty/raw body
│   ├── JsonTree.tsx               # Collapsible JSON tree viewer
│   ├── Sidebar.tsx                # Folder list, search, save/import/export
│   ├── FolderItem.tsx             # Single folder card with nested request list
│   ├── RequestTabs.tsx            # Open-request tab bar
│   ├── ThemeToggle.tsx            # Light/dark/system switcher
│   ├── UpdateChecker.tsx          # Auto-update notification banner
│   └── ui/                        # Radix-based primitives (button, input, select, badge)
├── services/
│   ├── ipc.ts                     # Tauri invoke wrappers (HTTP, save, load, import, export)
│   └── request-builder.ts         # buildHeaders(), buildUrl(), autoContentType()
├── store/
│   ├── useWorkspaceStore.ts       # Zustand store for workspace, folders, requests, tabs
│   ├── useThemeStore.ts           # Zustand store for theme preference
│   └── defaults.ts                # Default factories and normalizers for data models
└── types/
    └── index.ts                   # TypeScript interfaces for the entire data model

src-tauri/
├── src/
│   ├── lib.rs                     # Tauri plugin and command registration
│   ├── main.rs                    # Tauri app entry point
│   ├── commands/
│   │   ├── mod.rs                 # Command module exports
│   │   ├── network.rs             # HTTP, multipart, and binary request commands
│   │   └── fs.rs                  # Workspace save/load/import/export commands
│   └── models/
│       └── mod.rs                 # Rust structs for request/response payloads
└── tauri.conf.json                # Tauri app configuration and icon paths
```

## Getting Started

### Prerequisites

- Node.js 18+
- npm
- Rust toolchain (stable)
- Tauri system dependencies for your OS

Official setup guide: https://tauri.app/start/prerequisites/

### Install

```bash
npm install
```

### Run in Development

```bash
npm run tauri dev
```

## Available Scripts

| Command               | Description                      |
| --------------------- | -------------------------------- |
| `npm run dev`         | Start Vite dev server            |
| `npm run build`       | Type-check and build frontend    |
| `npm run typecheck`   | Run TypeScript checks            |
| `npm run test`        | Run frontend unit tests          |
| `npm run preview`     | Preview frontend build           |
| `npm run tauri dev`   | Run desktop app in dev mode      |
| `npm run tauri build` | Build production desktop bundles |

## Backend Tests

```bash
cd src-tauri
cargo test
```

## App Icon Generation

Place a square PNG source image (recommended 1024x1024) at `src-tauri/icons/icon.png`, then run:

```bash
npm run tauri icon src-tauri/icons/icon.png
```

The generated icon files are referenced by `src-tauri/tauri.conf.json`.

## Build for Release

```bash
npm run tauri build
```

This creates platform-specific application bundles/installers under `src-tauri/target/release/bundle`.

## Maintainer

- **Name:** Bipul Hf
- **Email:** bipulhf@gmail.com
- **GitHub:** https://github.com/bipulhf
- **Repository:** https://github.com/bipulhf/endpt

## Recommended IDE Setup

- VS Code / Cursor
- Tauri VS Code extension
- rust-analyzer extension
