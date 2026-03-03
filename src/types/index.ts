export type HttpMethod =
  | "GET"
  | "POST"
  | "PUT"
  | "PATCH"
  | "DELETE"
  | "HEAD"
  | "OPTIONS";

export interface HeaderRow {
  id: string;
  key: string;
  value: string;
  enabled: boolean;
}

export interface ApiRequest {
  id: string;
  name: string;
  method: HttpMethod;
  url: string;
  headers: HeaderRow[];
  body: string;
}

export interface Folder {
  id: string;
  name: string;
  collapsed: boolean;
  requests: ApiRequest[];
}

export interface Workspace {
  version: number;
  folders: Folder[];
}

export interface HttpResponse {
  status: number;
  headers: Record<string, string>;
  body: string;
  elapsed_ms: number;
}
