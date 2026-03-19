use serde_json::Value;
use std::fs;
use tauri::Manager;

/// Save workspace to the app's local data directory (no file picker).
#[tauri::command]
pub fn save_local_workspace(app: tauri::AppHandle, data: Value) -> Result<(), String> {
    let data_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("failed to resolve app data dir: {e}"))?;

    std::fs::create_dir_all(&data_dir)
        .map_err(|e| format!("failed to create app data dir: {e}"))?;

    let path = data_dir.join("workspace.json");
    let json =
        serde_json::to_string_pretty(&data).map_err(|e| format!("serialization error: {e}"))?;

    std::fs::write(&path, json).map_err(|e| format!("file write error: {e}"))
}

/// Load workspace from the app's local data directory.  Returns `null` if no
/// saved workspace exists yet (first launch).
#[tauri::command]
pub fn load_local_workspace(app: tauri::AppHandle) -> Result<Option<Value>, String> {
    let data_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("failed to resolve app data dir: {e}"))?;

    let path = data_dir.join("workspace.json");

    if !path.exists() {
        return Ok(None);
    }

    let contents = std::fs::read_to_string(&path).map_err(|e| format!("file read error: {e}"))?;

    serde_json::from_str(&contents)
        .map(Some)
        .map_err(|e| format!("json parse error: {e}"))
}

#[tauri::command]
pub fn export_workspace(path: String, data: Value) -> Result<(), String> {
    let json = serde_json::to_string_pretty(&data)
        .map_err(|error| format!("serialization error: {error}"))?;

    fs::write(&path, json).map_err(|error| format!("file write error at '{path}': {error}"))
}

#[tauri::command]
pub fn import_workspace(path: String) -> Result<Value, String> {
    let contents = fs::read_to_string(&path)
        .map_err(|error| format!("file read error at '{path}': {error}"))?;

    serde_json::from_str(&contents).map_err(|error| format!("json parse error: {error}"))
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;
    use std::env::temp_dir;

    fn temp_path(name: &str) -> String {
        temp_dir().join(name).to_string_lossy().to_string()
    }

    #[test]
    fn export_then_import_roundtrip() {
        let path = temp_path("endpt_test_workspace.json");
        let original = json!({
            "version": 3,
            "activeEnvironmentId": "env_dev",
            "environments": [
                {
                    "id": "env_dev",
                    "name": "Development",
                    "variables": [
                        {
                            "id": "v1",
                            "key": "BASE_URL",
                            "value": "https://api.dev.example.com",
                            "isSecret": false
                        },
                        {
                            "id": "v2",
                            "key": "TOKEN",
                            "value": "s3cr3t",
                            "isSecret": true
                        }
                    ]
                }
            ],
            "folders": [
                {
                    "id": "f1",
                    "name": "Auth",
                    "collapsed": false,
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

        export_workspace(path.clone(), original.clone()).expect("export workspace");
        let imported = import_workspace(path.clone()).expect("import workspace");

        assert_eq!(original, imported);

        let _ = std::fs::remove_file(&path);
    }

    #[test]
    fn import_nonexistent_file_returns_error() {
        let result = import_workspace("/tmp/this_file_does_not_exist_xyz.json".to_string());
        assert!(result.is_err());
    }

    #[test]
    fn export_invalid_path_returns_error() {
        let result = export_workspace(
            "/nonexistent_dir/workspace.json".to_string(),
            json!({"version":1,"folders":[]}),
        );

        assert!(result.is_err());
    }
}
