import { createId } from "../lib/utils";
import {
  ApiRequest,
  AuthConfig,
  Environment,
  EnvironmentVariable,
  FormDataRow,
  GrpcRequestConfig,
  HeaderRow,
  HttpMethod,
  QueryParam,
  RequestBody,
  RequestProtocol,
  SseRequestConfig,
  WebSocketRequestConfig,
  Workspace,
} from "../types";

export const ENV_KEY_PATTERN = /^[A-Za-z_][A-Za-z0-9_]*$/;
export const WORKSPACE_VERSION = 4;

export const createDefaultHeader = (): HeaderRow => ({
  id: createId(),
  key: "",
  value: "",
  enabled: true,
});

export const createDefaultAuth = (): AuthConfig => ({
  type: "none",
  bearer: { token: "" },
  basic: { username: "", password: "" },
  apiKey: { key: "", value: "", addTo: "header" },
});

export const createDefaultBody = (): RequestBody => ({
  type: "none",
  raw: "",
  rawLanguage: "text",
  formData: [],
  urlEncoded: [],
  binaryFilePath: null,
  graphql: {
    query: "",
    variables: "",
  },
});

export const createDefaultGrpcConfig = (): GrpcRequestConfig => ({
  endpoint: "",
  useTls: true,
  protoFiles: [],
  methodPath: "",
  metadata: [],
  payloadJson: "{\n  \n}",
});

export const createDefaultWebSocketConfig = (): WebSocketRequestConfig => ({
  url: "",
  headers: [],
  subprotocol: "",
  initialMessage: "",
});

export const createDefaultSseConfig = (): SseRequestConfig => ({
  url: "",
  headers: [],
});

export const createDefaultEnvironmentVariable = (): EnvironmentVariable => ({
  id: createId(),
  key: "",
  value: "",
  isSecret: false,
});

export const createDefaultEnvironment = (name = "Environment"): Environment => ({
  id: createId(),
  name,
  variables: [],
});

export const normalizeAuth = (auth: unknown): AuthConfig => {
  if (!auth || typeof auth !== "object") {
    return createDefaultAuth();
  }
  const partial = auth as Partial<AuthConfig>;
  return {
    ...createDefaultAuth(),
    ...partial,
    bearer: { ...createDefaultAuth().bearer, ...(partial.bearer ?? {}) },
    basic: { ...createDefaultAuth().basic, ...(partial.basic ?? {}) },
    apiKey: { ...createDefaultAuth().apiKey, ...(partial.apiKey ?? {}) },
  };
};

export const normalizeBody = (body: unknown): RequestBody => {
  if (typeof body === "string") {
    return {
      ...createDefaultBody(),
      type: body.trim().length > 0 ? "json" : "none",
      raw: body,
      rawLanguage: "json",
    };
  }

  if (!body || typeof body !== "object") {
    return createDefaultBody();
  }

  const partial = body as Partial<RequestBody>;
  return {
    ...createDefaultBody(),
    ...partial,
    graphql: {
      ...createDefaultBody().graphql,
      ...(partial.graphql ?? {}),
    },
    formData: Array.isArray(partial.formData) ? partial.formData : [],
    urlEncoded: Array.isArray(partial.urlEncoded) ? partial.urlEncoded : [],
  };
};

const HTTP_METHODS: HttpMethod[] = [
  "GET",
  "POST",
  "PUT",
  "PATCH",
  "DELETE",
  "HEAD",
  "OPTIONS",
];

const normalizeHeaderRows = (value: unknown): HeaderRow[] => {
  if (!Array.isArray(value)) {
    return [createDefaultHeader()];
  }

  const normalized = value
    .filter((item): item is Partial<HeaderRow> => Boolean(item && typeof item === "object"))
    .map((item) => ({
      id: typeof item.id === "string" && item.id.trim().length > 0 ? item.id : createId(),
      key: typeof item.key === "string" ? item.key : "",
      value: typeof item.value === "string" ? item.value : "",
      enabled: item.enabled !== false,
    }));

  return normalized.length > 0 ? normalized : [createDefaultHeader()];
};

const normalizeOptionalHeaderRows = (value: unknown): HeaderRow[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((item): item is Partial<HeaderRow> => Boolean(item && typeof item === "object"))
    .map((item) => ({
      id: typeof item.id === "string" && item.id.trim().length > 0 ? item.id : createId(),
      key: typeof item.key === "string" ? item.key : "",
      value: typeof item.value === "string" ? item.value : "",
      enabled: item.enabled !== false,
    }));
};

const normalizeQueryParams = (value: unknown): QueryParam[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((item): item is Partial<QueryParam> => Boolean(item && typeof item === "object"))
    .map((item) => ({
      id: typeof item.id === "string" && item.id.trim().length > 0 ? item.id : createId(),
      key: typeof item.key === "string" ? item.key : "",
      value: typeof item.value === "string" ? item.value : "",
      enabled: item.enabled !== false,
    }));
};

const normalizeFormRows = (value: unknown): FormDataRow[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((item): item is Partial<FormDataRow> => Boolean(item && typeof item === "object"))
    .map((item) => ({
      id: typeof item.id === "string" && item.id.trim().length > 0 ? item.id : createId(),
      key: typeof item.key === "string" ? item.key : "",
      value: typeof item.value === "string" ? item.value : "",
      type: item.type === "file" ? "file" : "text",
      enabled: item.enabled !== false,
    }));
};

const normalizeRequest = (entry: unknown): ApiRequest | null => {
  if (!entry || typeof entry !== "object") {
    return null;
  }

  const request = entry as Partial<ApiRequest>;
  const body = normalizeBody(request.body);
  body.formData = normalizeFormRows(body.formData);
  body.urlEncoded = normalizeFormRows(body.urlEncoded);

  const protocol: RequestProtocol = (
    request.protocol === "grpc" ||
    request.protocol === "websocket" ||
    request.protocol === "sse"
  )
    ? request.protocol
    : "http";

  const grpcPartial = request.grpc as Partial<GrpcRequestConfig> | undefined;
  const websocketPartial = request.websocket as Partial<WebSocketRequestConfig> | undefined;
  const ssePartial = request.sse as Partial<SseRequestConfig> | undefined;

  return {
    id: typeof request.id === "string" && request.id.trim().length > 0
      ? request.id
      : createId(),
    name: typeof request.name === "string" && request.name.trim().length > 0
      ? request.name
      : "Untitled Request",
    protocol,
    method: HTTP_METHODS.includes(request.method as HttpMethod)
      ? (request.method as HttpMethod)
      : "GET",
    url: typeof request.url === "string" ? request.url : "",
    headers: normalizeHeaderRows(request.headers),
    body,
    queryParams: normalizeQueryParams(request.queryParams),
    auth: normalizeAuth(request.auth),
    grpc: {
      ...createDefaultGrpcConfig(),
      ...grpcPartial,
      protoFiles: Array.isArray(grpcPartial?.protoFiles)
        ? grpcPartial?.protoFiles.filter((value): value is string => typeof value === "string")
        : [],
      metadata: normalizeOptionalHeaderRows(grpcPartial?.metadata),
    },
    websocket: {
      ...createDefaultWebSocketConfig(),
      ...websocketPartial,
      headers: normalizeOptionalHeaderRows(websocketPartial?.headers),
    },
    sse: {
      ...createDefaultSseConfig(),
      ...ssePartial,
      headers: normalizeOptionalHeaderRows(ssePartial?.headers),
    },
    lastResponse: request.lastResponse ?? null,
    lastGrpcResponse: request.lastGrpcResponse ?? null,
  };
};

const normalizeEnvironmentVariables = (value: unknown): EnvironmentVariable[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  const keys = new Set<string>();
  const normalized: EnvironmentVariable[] = [];

  for (const entry of value) {
    if (!entry || typeof entry !== "object") {
      continue;
    }

    const partial = entry as Partial<EnvironmentVariable>;
    const key = typeof partial.key === "string" ? partial.key.trim() : "";
    if (!ENV_KEY_PATTERN.test(key) || keys.has(key)) {
      continue;
    }

    keys.add(key);
    normalized.push({
      id: typeof partial.id === "string" && partial.id.trim().length > 0
        ? partial.id
        : createId(),
      key,
      value: typeof partial.value === "string" ? partial.value : "",
      isSecret: Boolean(partial.isSecret),
    });
  }

  return normalized;
};

const normalizeEnvironments = (value: unknown): Environment[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((entry): entry is Record<string, unknown> => Boolean(entry && typeof entry === "object"))
    .map((entry, index) => {
      const nameValue = typeof entry.name === "string" ? entry.name.trim() : "";
      return {
        id: typeof entry.id === "string" && entry.id.trim().length > 0
          ? entry.id
          : createId(),
        name: nameValue || `Environment ${index + 1}`,
        variables: normalizeEnvironmentVariables(entry.variables),
      };
    });
};

export const normalizeWorkspace = (data: unknown): Workspace => {
  const source: Record<string, unknown> = data && typeof data === "object"
    ? (data as Record<string, unknown>)
    : { folders: [] };

  const environments = normalizeEnvironments(source.environments);
  const activeEnvironmentIdValue =
    typeof source.activeEnvironmentId === "string"
      ? source.activeEnvironmentId
      : null;
  const activeEnvironmentId = environments.some((environment) =>
    environment.id === activeEnvironmentIdValue
  )
    ? activeEnvironmentIdValue
    : null;

  return {
    version: WORKSPACE_VERSION,
    folders: Array.isArray(source.folders)
      ? source.folders
        .filter((folder) => Boolean(folder && typeof folder === "object"))
        .map((folder) => {
          const folderRecord = folder as Record<string, unknown>;
          const requests = Array.isArray(folderRecord.requests)
            ? folderRecord.requests
            : [];
          return {
            id: typeof folderRecord.id === "string" && folderRecord.id.trim().length > 0
              ? folderRecord.id
              : createId(),
            name: typeof folderRecord.name === "string" && folderRecord.name.trim().length > 0
              ? folderRecord.name
              : "Untitled Folder",
            collapsed: Boolean(folderRecord.collapsed),
            requests: requests
              .map((request) => normalizeRequest(request))
              .filter((request): request is ApiRequest => Boolean(request)),
          };
        })
      : [],
    environments,
    activeEnvironmentId,
  };
};

export const createDefaultRequest = (name: string): ApiRequest => ({
  id: createId(),
  name,
  protocol: "http",
  method: "GET",
  url: "",
  headers: [createDefaultHeader()],
  queryParams: [],
  auth: createDefaultAuth(),
  body: createDefaultBody(),
  grpc: createDefaultGrpcConfig(),
  websocket: createDefaultWebSocketConfig(),
  sse: createDefaultSseConfig(),
  lastResponse: null,
  lastGrpcResponse: null,
});
