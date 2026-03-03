import { invoke } from "@tauri-apps/api/core";
import { open, save } from "@tauri-apps/plugin-dialog";
import { ApiRequest, Workspace, HttpResponse } from "../types";

const isWorkspace = (value: Workspace): boolean => {
  return value.version === 1 && Array.isArray(value.folders);
};

export const executeHttpRequest = async (request: ApiRequest): Promise<HttpResponse> => {
  const headers: Record<string, string> = {};

  for (const header of request.headers) {
    if (header.enabled && header.key.trim().length > 0) {
      headers[header.key.trim()] = header.value;
    }
  }

  return invoke<HttpResponse>("make_http_request", {
    payload: {
      method: request.method,
      url: request.url,
      headers,
      body: request.body.trim().length > 0 ? request.body : null,
    },
  });
};

export const exportData = async (workspace: Workspace): Promise<void> => {
  const path = await save({
    defaultPath: "workspace.json",
    filters: [{ name: "JSON", extensions: ["json"] }],
  });

  if (!path) {
    return;
  }

  await invoke("export_workspace", { path, data: workspace });
};

export const importData = async (): Promise<Workspace | null> => {
  const selected = await open({
    multiple: false,
    filters: [{ name: "JSON", extensions: ["json"] }],
  });

  if (!selected || Array.isArray(selected)) {
    return null;
  }

  const data = await invoke<Workspace>("import_workspace", { path: selected });

  if (!isWorkspace(data)) {
    throw new Error("Imported file is not a valid workspace");
  }

  return data;
};
