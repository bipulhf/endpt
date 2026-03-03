import { invoke } from "@tauri-apps/api/core";
import { open, save } from "@tauri-apps/plugin-dialog";
import { ApiRequest, HttpResponse, Workspace } from "../types";

const isWorkspace = (value: Workspace): boolean => {
  return typeof value?.version === "number" && Array.isArray(value.folders);
};

const autoContentType = (request: ApiRequest): string | null => {
  switch (request.body.type) {
    case "json":
      return "application/json";
    case "graphql":
      return "application/json";
    case "x-www-form-urlencoded":
      return "application/x-www-form-urlencoded";
    case "binary":
      return "application/octet-stream";
    case "raw":
      switch (request.body.rawLanguage) {
        case "json":
          return "application/json";
        case "xml":
          return "application/xml";
        case "html":
          return "text/html";
        case "javascript":
          return "application/javascript";
        default:
          return "text/plain";
      }
    default:
      return null;
  }
};

const buildHeaders = (request: ApiRequest): Record<string, string> => {
  const headers: Record<string, string> = {};

  for (const header of request.headers) {
    if (header.enabled && header.key.trim().length > 0) {
      headers[header.key.trim()] = header.value;
    }
  }

  const contentType = autoContentType(request);
  if (contentType && !headers["Content-Type"] && !headers["content-type"]) {
    headers["Content-Type"] = contentType;
  }

  return headers;
};

export const executeHttpRequest = async (request: ApiRequest): Promise<HttpResponse> => {
  const headers = buildHeaders(request);

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
      url: request.url,
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
      url: request.url,
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
        url: request.url,
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
        url: request.url,
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
      url: request.url,
      headers,
      body,
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
