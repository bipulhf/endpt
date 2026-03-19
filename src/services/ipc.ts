import { invoke } from "@tauri-apps/api/core";
import { listen, UnlistenFn } from "@tauri-apps/api/event";
import { open, save } from "@tauri-apps/plugin-dialog";
import {
  ApiRequest,
  GrpcMethodDescriptor,
  GrpcProtoImportResult,
  GrpcUnaryResponse,
  HttpResponse,
  StreamEvent,
  Workspace,
} from "../types";
import { buildHeaders, buildUrl } from "./request-builder";

const isWorkspace = (value: unknown): value is Workspace => {
  if (!value || typeof value !== "object") {
    return false;
  }

  const workspace = value as Partial<Workspace>;
  return typeof workspace.version === "number" && Array.isArray(workspace.folders);
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

export const importGrpcProtoFiles = async (): Promise<GrpcProtoImportResult | null> => {
  const selected = await open({
    multiple: true,
    filters: [{ name: "Proto", extensions: ["proto"] }],
  });

  if (!selected) {
    return null;
  }

  const paths = Array.isArray(selected) ? selected : [selected];
  if (paths.length === 0) {
    return null;
  }

  return invoke<GrpcProtoImportResult>("import_proto_files", { paths });
};

export const listGrpcMethods = async (
  protoFiles: string[],
): Promise<GrpcMethodDescriptor[]> => {
  return invoke<GrpcMethodDescriptor[]>("list_grpc_methods", {
    proto_files: protoFiles,
    protoFiles,
  });
};

export const executeGrpcUnaryRequest = async (
  request: ApiRequest,
): Promise<GrpcUnaryResponse> => {
  const metadata = request.grpc.metadata
    .filter((row) => row.enabled && row.key.trim().length > 0)
    .reduce<Record<string, string>>((acc, row) => {
      acc[row.key.trim()] = row.value;
      return acc;
    }, {});

  return invoke<GrpcUnaryResponse>("call_grpc_unary", {
    payload: {
      endpoint: request.grpc.endpoint,
      use_tls: request.grpc.useTls,
      useTls: request.grpc.useTls,
      proto_files: request.grpc.protoFiles,
      protoFiles: request.grpc.protoFiles,
      method_path: request.grpc.methodPath,
      methodPath: request.grpc.methodPath,
      metadata,
      body_json: request.grpc.payloadJson,
      bodyJson: request.grpc.payloadJson,
    },
  });
};

const toEnabledHeaderMap = (
  rows: ApiRequest["websocket"]["headers"],
): Record<string, string> =>
  rows
    .filter((row) => row.enabled && row.key.trim().length > 0)
    .reduce<Record<string, string>>((acc, row) => {
      acc[row.key.trim()] = row.value;
      return acc;
    }, {});

export const wsConnect = async (
  requestId: string,
  config: ApiRequest["websocket"],
): Promise<string> => {
  const response = await invoke<{ session_id: string }>("ws_connect", {
    payload: {
      request_id: requestId,
      requestId,
      url: config.url,
      headers: toEnabledHeaderMap(config.headers),
      subprotocol: config.subprotocol.trim() || null,
    },
  });

  return response.session_id;
};

export const wsSend = async (
  sessionId: string,
  message: string,
): Promise<void> => {
  await invoke("ws_send", {
    payload: {
      session_id: sessionId,
      sessionId,
      message,
    },
  });
};

export const wsDisconnect = async (sessionId: string): Promise<void> => {
  await invoke("ws_disconnect", {
    payload: {
      session_id: sessionId,
      sessionId,
    },
  });
};

export const sseConnect = async (
  requestId: string,
  config: ApiRequest["sse"],
): Promise<string> => {
  const response = await invoke<{ session_id: string }>("sse_connect", {
    payload: {
      request_id: requestId,
      requestId,
      url: config.url,
      headers: toEnabledHeaderMap(config.headers),
    },
  });

  return response.session_id;
};

export const sseDisconnect = async (sessionId: string): Promise<void> => {
  await invoke("sse_disconnect", {
    payload: {
      session_id: sessionId,
      sessionId,
    },
  });
};

export const listenStreamEvents = async (
  handler: (event: StreamEvent) => void,
): Promise<UnlistenFn> => {
  return listen<StreamEvent>("stream_event", (event) => {
    handler(event.payload);
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
