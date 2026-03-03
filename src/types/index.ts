export type HttpMethod =
  | "GET"
  | "POST"
  | "PUT"
  | "PATCH"
  | "DELETE"
  | "HEAD"
  | "OPTIONS";

export type BodyType =
  | "none"
  | "json"
  | "raw"
  | "form-data"
  | "x-www-form-urlencoded"
  | "binary"
  | "graphql";

export type RawLanguage = "text" | "json" | "xml" | "html" | "javascript";

export interface HeaderRow {
  id: string;
  key: string;
  value: string;
  enabled: boolean;
}

export interface FormDataRow {
  id: string;
  key: string;
  value: string;
  type: "text" | "file";
  enabled: boolean;
}

export interface GraphQLBody {
  query: string;
  variables: string;
}

export interface RequestBody {
  type: BodyType;
  raw: string;
  rawLanguage: RawLanguage;
  formData: FormDataRow[];
  urlEncoded: FormDataRow[];
  binaryFilePath: string | null;
  graphql: GraphQLBody;
}

export interface ApiRequest {
  id: string;
  name: string;
  method: HttpMethod;
  url: string;
  headers: HeaderRow[];
  body: RequestBody;
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
  size_bytes: number;
}
