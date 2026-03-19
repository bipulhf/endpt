export type HttpMethod =
  | "GET"
  | "POST"
  | "PUT"
  | "PATCH"
  | "DELETE"
  | "HEAD"
  | "OPTIONS";

export type RequestProtocol = "http" | "grpc" | "websocket" | "sse";

export type BodyType =
  | "none"
  | "json"
  | "raw"
  | "form-data"
  | "x-www-form-urlencoded"
  | "binary"
  | "graphql";

export type RawLanguage = "text" | "json" | "xml" | "html" | "javascript";
export type AuthType = "none" | "bearer" | "basic" | "api-key";

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

export interface QueryParam {
  id: string;
  key: string;
  value: string;
  enabled: boolean;
}

export interface AuthConfig {
  type: AuthType;
  bearer: { token: string };
  basic: { username: string; password: string };
  apiKey: { key: string; value: string; addTo: "header" | "query" };
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

export interface GrpcRequestConfig {
  endpoint: string;
  useTls: boolean;
  protoFiles: string[];
  methodPath: string;
  metadata: HeaderRow[];
  payloadJson: string;
}

export interface WebSocketRequestConfig {
  url: string;
  headers: HeaderRow[];
  subprotocol: string;
  initialMessage: string;
}

export interface SseRequestConfig {
  url: string;
  headers: HeaderRow[];
}

export interface ApiRequest {
  id: string;
  name: string;
  protocol: RequestProtocol;
  method: HttpMethod;
  url: string;
  headers: HeaderRow[];
  body: RequestBody;
  queryParams: QueryParam[];
  auth: AuthConfig;
  grpc: GrpcRequestConfig;
  websocket: WebSocketRequestConfig;
  sse: SseRequestConfig;
  lastResponse?: HttpResponse | null;
  lastGrpcResponse?: GrpcUnaryResponse | null;
}

export interface Folder {
  id: string;
  name: string;
  collapsed: boolean;
  requests: ApiRequest[];
}

export interface EnvironmentVariable {
  id: string;
  key: string;
  value: string;
  isSecret: boolean;
}

export interface Environment {
  id: string;
  name: string;
  variables: EnvironmentVariable[];
}

export interface Workspace {
  version: number;
  folders: Folder[];
  environments: Environment[];
  activeEnvironmentId: string | null;
}

export interface HttpResponse {
  status: number;
  headers: Record<string, string>;
  body: string;
  elapsed_ms: number;
  size_bytes: number;
}

export interface GrpcMethodDescriptor {
  method_path: string;
  service: string;
  method: string;
  request_type?: string;
  response_type?: string;
}

export interface GrpcProtoImportResult {
  proto_files: string[];
  methods: GrpcMethodDescriptor[];
}

export interface GrpcUnaryResponse {
  status_code: number;
  status_text: string;
  headers: Record<string, string>;
  trailers: Record<string, string>;
  body: string;
  elapsed_ms: number;
  size_bytes: number;
}

export type StreamProtocol = "websocket" | "sse";
export type StreamDirection = "inbound" | "outbound" | "status" | "error";

export interface StreamEvent {
  request_id: string;
  session_id: string;
  protocol: StreamProtocol;
  direction: StreamDirection;
  timestamp_ms: number;
  payload: string;
  event_type?: string;
  metadata?: Record<string, string>;
}
