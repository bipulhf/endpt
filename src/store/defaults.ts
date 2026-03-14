import { createId } from "../lib/utils";
import { ApiRequest, AuthConfig, HeaderRow, RequestBody, Workspace } from "../types";

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

export const normalizeWorkspace = (data: Workspace): Workspace => ({
  version: 2,
  folders: data.folders.map((folder) => ({
    ...folder,
    requests: folder.requests.map((request) => ({
      ...request,
      queryParams: Array.isArray(request.queryParams) ? request.queryParams : [],
      auth: normalizeAuth(request.auth),
      body: normalizeBody(request.body),
      lastResponse: request.lastResponse ?? null,
    })),
  })),
});

export const createDefaultRequest = (name: string): ApiRequest => ({
  id: createId(),
  name,
  method: "GET",
  url: "",
  headers: [createDefaultHeader()],
  queryParams: [],
  auth: createDefaultAuth(),
  body: createDefaultBody(),
  lastResponse: null,
});
