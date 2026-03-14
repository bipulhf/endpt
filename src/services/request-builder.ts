import { ApiRequest } from "../types";

export const autoContentType = (request: ApiRequest): string | null => {
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

export const buildHeaders = (request: ApiRequest): Record<string, string> => {
  const headers: Record<string, string> = {};

  for (const header of request.headers) {
    if (header.enabled && header.key.trim().length > 0) {
      headers[header.key.trim()] = header.value;
    }
  }

  if (request.auth) {
    switch (request.auth.type) {
      case "bearer":
        if (request.auth.bearer.token.trim()) {
          headers["Authorization"] = `Bearer ${request.auth.bearer.token.trim()}`;
        }
        break;
      case "basic": {
        const { username, password } = request.auth.basic;
        if (username.trim()) {
          headers["Authorization"] = `Basic ${btoa(`${username}:${password}`)}`;
        }
        break;
      }
      case "api-key":
        if (request.auth.apiKey.addTo === "header" && request.auth.apiKey.key.trim()) {
          headers[request.auth.apiKey.key.trim()] = request.auth.apiKey.value;
        }
        break;
    }
  }

  const contentType = autoContentType(request);
  if (contentType && !headers["Content-Type"] && !headers["content-type"]) {
    headers["Content-Type"] = contentType;
  }

  return headers;
};

export const buildUrl = (request: ApiRequest): string => {
  let url = request.url;

  const enabledParams = (request.queryParams ?? []).filter(
    (p) => p.enabled && p.key.trim().length > 0,
  );

  if (request.auth?.type === "api-key" && request.auth.apiKey.addTo === "query" && request.auth.apiKey.key.trim()) {
    enabledParams.push({
      id: "__auth__",
      key: request.auth.apiKey.key.trim(),
      value: request.auth.apiKey.value,
      enabled: true,
    });
  }

  if (enabledParams.length > 0) {
    try {
      const urlObj = new URL(url);
      for (const param of enabledParams) {
        urlObj.searchParams.set(param.key.trim(), param.value);
      }
      url = urlObj.toString();
    } catch {
      const qs = enabledParams
        .map((p) => `${encodeURIComponent(p.key.trim())}=${encodeURIComponent(p.value)}`)
        .join("&");
      url += (url.includes("?") ? "&" : "?") + qs;
    }
  }

  return url;
};
