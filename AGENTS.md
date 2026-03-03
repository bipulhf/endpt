# AGENTS.md - High-Performance Modular API Client (Tauri + React + Rust)

## Context
You are an expert Full-Stack and Systems Developer. Your objective is to build a hyper-optimized, lightweight, and modular desktop API client (a blazing-fast Postman/Insomnia alternative) for Linux, Windows, and macOS. 

The application must be built using **Tauri v2**, with a **Rust** backend for system-level networking/file I/O and a **React + TypeScript + Vite** frontend. The UI should be styled using **Tailwind CSS**. State management must be handled by **Zustand**.

## Core Requirements
1. **Network Execution:** All HTTP requests MUST be executed by the Rust backend using the `reqwest` crate to bypass browser webview CORS restrictions.
2. **Data Structure:** The app must support a "Workspace" that contains "Folders", which in turn contain "API Requests".
3. **Persistence:** Users must be able to export their Workspace to a JSON file and import it back via the Rust file system APIs.
4. **Performance First:** The Rust binary must be aggressively optimized for minimal binary size and instant startup time.
5. **Testing:** The codebase must include foundational testing setups for both frontend (Vitest) and backend (Cargo test).

---

## Execution Roadmap

### Phase 1: Environment & Scaffolding
**Goal:** Initialize the Tauri workspace and install all necessary frontend dependencies.
1. Run `npm create tauri-app@latest . -- --template react-ts --manager npm`.
2. Install UI and State dependencies:
   - Run `npm install lucide-react zustand`.
   - Run `npm install -D tailwindcss postcss autoprefixer`.
   - Initialize Tailwind (`npx tailwindcss init -p`) and configure `tailwind.config.js` to scan all source files. Add directives to `index.css`.
3. Install Testing dependencies:
   - Run `npm install -D vitest @testing-library/react @testing-library/jest-dom jsdom`.
   - Update `vite.config.ts` to include Vitest configuration (environment: 'jsdom').

### Phase 2: Rust Backend - Modular & Optimized
**Goal:** Build the system engine for networking and file I/O.
1. In `src-tauri/Cargo.toml`, add the following dependencies:
   - `reqwest = { version = "0.12", features = ["json"] }`
   - `serde = { version = "1.0", features = ["derive"] }`
   - `serde_json = "1.0"`
   - `tokio = { version = "1", features = ["full"] }`
2. **Aggressive Optimization:** Append the following profile configurations to `Cargo.toml`:
   ```toml
   [profile.release]
   opt-level = 3
   lto = true
   codegen-units = 1
   strip = true

```

3. Create a modular directory structure: `src-tauri/src/commands/` and `src-tauri/src/models/`.
4. Define standard data structures in `models/mod.rs` (e.g., `HttpRequestPayload`, `HttpResponsePayload`).
5. Implement commands in `commands/network.rs` (e.g., `make_http_request` using `reqwest::Client`).
6. Implement commands in `commands/fs.rs` (e.g., `export_workspace` and `import_workspace` using `std::fs` and `serde_json`).
7. Write unit tests within the Rust modules using `#[cfg(test)]` to verify network request formatting and JSON serialization.
8. Register all commands in `src-tauri/src/main.rs`.

### Phase 3: Frontend Types & State Management

**Goal:** Define the TypeScript interfaces and set up the Zustand global store.

1. Create `src/types/index.ts`. Define exact interfaces mapping to the Rust structs:
* `ApiRequest` (id, name, method, url, headers, body)
* `Folder` (id, name, requests: ApiRequest[])
* `Workspace` (folders: Folder[])


2. Create `src/store/useWorkspaceStore.ts` using Zustand.
* Define state: `workspace: Workspace`, `activeRequestId: string | null`.
* Define actions: `createFolder`, `createRequest`, `updateRequest`, `setActiveRequest`, `loadWorkspaceFromData`.


3. Create `src/services/ipc.ts` to cleanly wrap `@tauri-apps/api/core` invoke calls into strongly-typed asynchronous TypeScript functions (`executeHttpRequest`, `exportData`, `importData`).

### Phase 4: UI Implementation

**Goal:** Build a modern, high-contrast, responsive interface.

1. **Layout Structure:** Clear `App.tsx` and implement a CSS Grid or Flexbox layout with a Sidebar on the left and a Main Workspace on the right.
2. **Sidebar Component (`src/components/Sidebar.tsx`):**
* Read from the Zustand store to render the tree of Folders and Requests.
* Include action buttons for "New Folder", "New Request", "Import", and "Export".


3. **Workspace Editor (`src/components/RequestEditor.tsx`):**
* Display fields for the currently active request.
* URL input, Method dropdown, dynamic Key/Value rows for Headers, and a `<textarea>` for the JSON Body.
* A prominent "Send" button that triggers the Rust IPC call.


4. **Response Pane (`src/components/ResponsePane.tsx`):**
* Display the HTTP status code, time taken (ms), and a scrollable `<pre>` block containing the formatted JSON response.



### Phase 5: Polish & Validation

**Goal:** Ensure the system is self-sufficient and stable.

1. Write at least two frontend unit tests in a `src/components/__tests__/` directory to verify that Zustand state updates correctly when a new folder or request is added.
2. Verify the application runs in development mode (`npm run tauri dev`).
3. Confirm that CORS is successfully bypassed by making a request to an external, strictly CORS-protected API.
4. Build the final optimized binary using `npm run tauri build`.
