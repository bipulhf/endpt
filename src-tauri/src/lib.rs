mod commands;
mod models;

use commands::fs::{
    export_workspace, import_workspace, load_local_workspace, save_local_workspace,
};
use commands::network::{make_binary_request, make_http_request, make_multipart_request};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            make_http_request,
            make_multipart_request,
            make_binary_request,
            export_workspace,
            import_workspace,
            save_local_workspace,
            load_local_workspace
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
