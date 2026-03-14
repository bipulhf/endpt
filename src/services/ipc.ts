import { invoke } from "@tauri-apps/api/core";
import { open, save } from "@tauri-apps/plugin-dialog";
import { ApiRequest, HttpResponse, Workspace } from "../types";
import { buildHeaders, buildUrl } from "./request-builder";

const isWorkspace = (value: Workspace): boolean => {
  return typeof value?.version === "number" && Array.isArray(value.folders);
};

export const executeHttpRequest = async (request: ApiRequest): Promise<HttpResponse> => {
  const headers = buildHeaders(request);
  const url = buildUrl(request);

  if (request.body.type === "form-data") {
    const parts = request.body.formData
      .filter((row) => row.enabled && row.key.trim().length > 0)
      .map((row) => ({
        key: row.key,
        value: row.value,
        part_type: row.type,
      }));

    return invoke<HttpResponse>("make_multipart_request", {
      method: request.method,
      url,
      headers,
      parts,
    });
  }

  if (request.body.type === "binary") {
    if (!request.body.binaryFilePath) {
      throw new Error("Select a file for binary body before sending");
    }

    return invoke<HttpResponse>("make_binary_request", {
      method: request.method,
      url,
      headers,
      file_path: request.body.binaryFilePath,
      filePath: request.body.binaryFilePath,
    });
  }

  if (request.body.type === "x-www-form-urlencoded") {
    const encoded = request.body.urlEncoded
      .filter((row) => row.enabled && row.key.trim().length > 0)
      .map((row) => `${encodeURIComponent(row.key)}=${encodeURIComponent(row.value)}`)
      .join("&");

    return invoke<HttpResponse>("make_http_request", {
      payload: {
        method: request.method,
        url,
        headers,
        body: encoded || null,
      },
    });
  }

  if (request.body.type === "graphql") {
    let variables: Record<string, unknown> | undefined;
    if (request.body.graphql.variables.trim().length > 0) {
      variables = JSON.parse(request.body.graphql.variables) as Record<string, unknown>;
    }

    return invoke<HttpResponse>("make_http_request", {
      payload: {
        method: request.method,
        url,
        headers,
        body: JSON.stringify({
          query: request.body.graphql.query,
          variables,
        }),
      },
    });
  }

  const body = request.body.type === "none" ? null : request.body.raw.trim() || null;

  return invoke<HttpResponse>("make_http_request", {
    payload: {
      method: request.method,
      url,
      headers,
      body,
    },
  });
};

export const saveLocalData = async (workspace: Workspace): Promise<void> => {
  await invoke("save_local_workspace", { data: workspace });
};

export const loadLocalData = async (): Promise<Workspace | null> => {
  const data = await invoke<Workspace | null>("load_local_workspace");
  if (!data || !isWorkspace(data)) return null;
  return data;
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
