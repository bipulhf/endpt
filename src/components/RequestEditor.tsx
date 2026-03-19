import {
  Globe,
  Radio,
  Send,
  Waypoints,
  Waves,
} from "lucide-react";
import { ReactElement, useMemo, useState } from "react";
import {
  executeGrpcUnaryRequest,
  executeHttpRequest,
  importGrpcProtoFiles,
  listGrpcMethods,
  saveLocalData,
  sseConnect,
  sseDisconnect,
  wsConnect,
  wsDisconnect,
  wsSend,
} from "../services/ipc";
import {
  formatResolverIssues,
  hasResolverIssues,
  resolveRequestTemplate,
} from "../services/env-resolver";
import { useRealtimeStore } from "../store/useRealtimeStore";
import { useWorkspaceStore } from "../store/useWorkspaceStore";
import { PROTOCOL_LABELS } from "../constants/protocols";
import { HTTP_METHODS, METHOD_TEXT_COLORS } from "../constants/methods";
import {
  ApiRequest,
  AuthConfig,
  GrpcMethodDescriptor,
  HeaderRow,
  HttpMethod,
  QueryParam,
  RequestBody,
  RequestProtocol,
} from "../types";
import { AuthEditor } from "./AuthEditor";
import { BodyEditor } from "./BodyEditor";
import { EnvAutocompleteField } from "./EnvAutocompleteField";
import { GrpcRequestEditor } from "./GrpcRequestEditor";
import { HeadersEditor, createHeader } from "./HeadersEditor";
import { ParamsEditor } from "./ParamsEditor";
import { RequestTabs } from "./RequestTabs";
import { SseRequestEditor } from "./SseRequestEditor";
import { WebSocketRequestEditor } from "./WebSocketRequestEditor";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";

interface RequestEditorProps {
  isBusy: boolean;
  setIsBusy: (value: boolean) => void;
}

type HttpEditorTab = "params" | "headers" | "auth" | "body";

const PROTOCOL_OPTIONS: Array<{
  value: RequestProtocol;
  icon: React.ComponentType<{ size?: number; className?: string }>;
}> = [
  { value: "http", icon: Globe },
  { value: "grpc", icon: Waypoints },
  { value: "websocket", icon: Radio },
  { value: "sse", icon: Waves },
];

const normalizeProtocol = (value: string): RequestProtocol => {
  if (value === "grpc" || value === "websocket" || value === "sse") {
    return value;
  }
  return "http";
};

const toTabLabel = (request: ApiRequest): string => {
  const protocol = normalizeProtocol(request.protocol);

  if (protocol === "http") {
    return request.method;
  }

  switch (protocol) {
    case "grpc":
      return "gRPC";
    case "websocket":
      return "WS";
    case "sse":
      return "SSE";
    default:
      return "HTTP";
  }
};

export const RequestEditor = ({ isBusy, setIsBusy }: RequestEditorProps): ReactElement => {
  const activeRequestId = useWorkspaceStore((state) => state.activeRequestId);
  const openRequestIds = useWorkspaceStore((state) => state.openRequestIds);
  const workspace = useWorkspaceStore((state) => state.workspace);
  const updateRequest = useWorkspaceStore((state) => state.updateRequest);
  const setActiveRequest = useWorkspaceStore((state) => state.setActiveRequest);
  const closeRequestTab = useWorkspaceStore((state) => state.closeRequestTab);
  const setRequestProtocol = useWorkspaceStore((state) => state.setRequestProtocol);
  const updateGrpcConfig = useWorkspaceStore((state) => state.updateGrpcConfig);
  const updateWebSocketConfig = useWorkspaceStore((state) => state.updateWebSocketConfig);
  const updateSseConfig = useWorkspaceStore((state) => state.updateSseConfig);
  const getActiveEnvironmentVariables = useWorkspaceStore(
    (state) => state.getActiveEnvironmentVariables,
  );

  const sessionsByRequest = useRealtimeStore((state) => state.sessionsByRequest);
  const setSessionState = useRealtimeStore((state) => state.setSessionState);

  const [activeHttpTab, setActiveHttpTab] = useState<HttpEditorTab>("params");
  const [error, setError] = useState("");
  const [grpcMethodsByRequest, setGrpcMethodsByRequest] = useState<
    Record<string, GrpcMethodDescriptor[]>
  >({});
  const [loadingGrpcMethods, setLoadingGrpcMethods] = useState(false);

  const requestMap = useMemo(() => {
    const entries = workspace.folders.flatMap((folder) =>
      folder.requests.map((request) => [request.id, request] as const),
    );
    return new Map(entries);
  }, [workspace.folders]);

  const openTabs = useMemo(
    () =>
      openRequestIds
        .map((id) => requestMap.get(id))
        .filter((item): item is NonNullable<typeof item> => Boolean(item)),
    [openRequestIds, requestMap],
  );

  const activeRequest = useMemo(() => {
    for (const folder of workspace.folders) {
      const found = folder.requests.find((request) => request.id === activeRequestId);
      if (found) {
        return found;
      }
    }
    return null;
  }, [workspace.folders, activeRequestId]);

  const activeProtocol = activeRequest
    ? normalizeProtocol(activeRequest.protocol)
    : "http";

  const activeEnvironmentVariables = getActiveEnvironmentVariables();
  const activeSession = activeRequest ? sessionsByRequest[activeRequest.id] ?? null : null;
  const activeGrpcMethods = activeRequest ? grpcMethodsByRequest[activeRequest.id] ?? [] : [];

  const resolveCurrentRequest = (): ApiRequest | null => {
    if (!activeRequest) {
      return null;
    }

    const resolved = resolveRequestTemplate(activeRequest, activeEnvironmentVariables);
    if (hasResolverIssues(resolved.diagnostics)) {
      setError(formatResolverIssues(resolved.diagnostics).join(" | "));
      return null;
    }

    setError("");
    return resolved.request;
  };

  const updateHeader = (
    headerId: string,
    key: keyof HeaderRow,
    value: string | boolean,
  ): void => {
    if (!activeRequest) {
      return;
    }

    const headers = activeRequest.headers.map((header) =>
      header.id === headerId ? { ...header, [key]: value } : header,
    );

    updateRequest(activeRequest.id, { headers });
  };

  const addHeader = (): void => {
    if (!activeRequest) {
      return;
    }

    updateRequest(activeRequest.id, {
      headers: [...activeRequest.headers, createHeader()],
    });
  };

  const removeHeader = (headerId: string): void => {
    if (!activeRequest) {
      return;
    }

    const headers = activeRequest.headers.filter((header) => header.id !== headerId);
    updateRequest(activeRequest.id, { headers });
  };

  const updateBody = (nextBody: RequestBody): void => {
    if (!activeRequest) {
      return;
    }

    updateRequest(activeRequest.id, { body: nextBody });
  };

  const updateAuth = (auth: AuthConfig): void => {
    if (!activeRequest) {
      return;
    }

    updateRequest(activeRequest.id, { auth });
  };

  const updateQueryParams = (queryParams: QueryParam[]): void => {
    if (!activeRequest) {
      return;
    }

    updateRequest(activeRequest.id, { queryParams });
  };

  const handleHttpSend = async (): Promise<void> => {
    if (!activeRequest) {
      return;
    }

    const resolved = resolveCurrentRequest();
    if (!resolved) {
      return;
    }

    if (!resolved.url.trim()) {
      setError("HTTP request URL is required");
      return;
    }

    setIsBusy(true);

    try {
      const response = await executeHttpRequest(resolved);
      updateRequest(activeRequest.id, { lastResponse: response });
      void saveLocalData(useWorkspaceStore.getState().workspace);
    } catch (requestError) {
      const message = requestError instanceof Error ? requestError.message : "Request failed";
      setError(message);
    } finally {
      setIsBusy(false);
    }
  };

  const handleGrpcImportProto = async (): Promise<void> => {
    if (!activeRequest) {
      return;
    }

    setIsBusy(true);
    try {
      const result = await importGrpcProtoFiles();
      if (!result) {
        return;
      }

      const currentMethod = activeRequest.grpc.methodPath;
      const nextMethod = result.methods.some((method) => method.method_path === currentMethod)
        ? currentMethod
        : (result.methods[0]?.method_path ?? "");

      updateGrpcConfig(activeRequest.id, {
        protoFiles: result.proto_files,
        methodPath: nextMethod,
      });

      setGrpcMethodsByRequest((current) => ({
        ...current,
        [activeRequest.id]: result.methods,
      }));
    } catch (requestError) {
      const message =
        requestError instanceof Error ? requestError.message : "Proto import failed";
      setError(message);
    } finally {
      setIsBusy(false);
    }
  };

  const handleGrpcRefreshMethods = async (): Promise<void> => {
    if (!activeRequest) {
      return;
    }

    const resolved = resolveCurrentRequest();
    if (!resolved) {
      return;
    }

    if (resolved.grpc.protoFiles.length === 0) {
      setError("Import at least one .proto file first");
      return;
    }

    setLoadingGrpcMethods(true);
    try {
      const methods = await listGrpcMethods(resolved.grpc.protoFiles);
      setGrpcMethodsByRequest((current) => ({
        ...current,
        [activeRequest.id]: methods,
      }));

      if (!methods.some((method) => method.method_path === activeRequest.grpc.methodPath)) {
        updateGrpcConfig(activeRequest.id, {
          methodPath: methods[0]?.method_path ?? "",
        });
      }
    } catch (requestError) {
      const message =
        requestError instanceof Error ? requestError.message : "Method discovery failed";
      setError(message);
    } finally {
      setLoadingGrpcMethods(false);
    }
  };

  const handleGrpcCall = async (): Promise<void> => {
    if (!activeRequest) {
      return;
    }

    const resolved = resolveCurrentRequest();
    if (!resolved) {
      return;
    }

    if (!resolved.grpc.endpoint.trim()) {
      setError("gRPC endpoint is required");
      return;
    }

    if (resolved.grpc.protoFiles.length === 0) {
      setError("Import at least one .proto file before calling");
      return;
    }

    if (!resolved.grpc.methodPath.trim()) {
      setError("Select a gRPC method");
      return;
    }

    setIsBusy(true);

    try {
      const response = await executeGrpcUnaryRequest(resolved);
      updateRequest(activeRequest.id, { lastGrpcResponse: response });
      void saveLocalData(useWorkspaceStore.getState().workspace);
    } catch (requestError) {
      const message = requestError instanceof Error ? requestError.message : "gRPC call failed";
      setError(message);
    } finally {
      setIsBusy(false);
    }
  };

  const handleWebSocketConnect = async (): Promise<void> => {
    if (!activeRequest) {
      return;
    }

    const resolved = resolveCurrentRequest();
    if (!resolved) {
      return;
    }

    if (!resolved.websocket.url.trim()) {
      setError("WebSocket URL is required");
      return;
    }

    setSessionState(activeRequest.id, {
      protocol: "websocket",
      status: "connecting",
      error: null,
    });

    setIsBusy(true);
    try {
      const sessionId = await wsConnect(activeRequest.id, resolved.websocket);
      setSessionState(activeRequest.id, {
        protocol: "websocket",
        status: "connected",
        sessionId,
        error: null,
      });

      const message = resolved.websocket.initialMessage.trim();
      if (message) {
        await wsSend(sessionId, message);
      }
    } catch (requestError) {
      const message = requestError instanceof Error ? requestError.message : "WebSocket connect failed";
      setSessionState(activeRequest.id, {
        protocol: "websocket",
        status: "error",
        sessionId: null,
        error: message,
      });
      setError(message);
    } finally {
      setIsBusy(false);
    }
  };

  const handleWebSocketDisconnect = async (): Promise<void> => {
    if (!activeRequest || !activeSession?.sessionId) {
      return;
    }

    setIsBusy(true);
    try {
      await wsDisconnect(activeSession.sessionId);
      setSessionState(activeRequest.id, {
        protocol: "websocket",
        status: "disconnected",
        sessionId: null,
        error: null,
      });
    } catch (requestError) {
      const message =
        requestError instanceof Error ? requestError.message : "WebSocket disconnect failed";
      setError(message);
    } finally {
      setIsBusy(false);
    }
  };

  const handleWebSocketSend = async (): Promise<void> => {
    if (!activeRequest || !activeSession?.sessionId) {
      setError("WebSocket is not connected");
      return;
    }

    const resolved = resolveCurrentRequest();
    if (!resolved) {
      return;
    }

    const message = resolved.websocket.initialMessage.trim();
    if (!message) {
      setError("Message payload is empty");
      return;
    }

    try {
      await wsSend(activeSession.sessionId, message);
      setError("");
    } catch (requestError) {
      const errorMessage = requestError instanceof Error ? requestError.message : "WebSocket send failed";
      setSessionState(activeRequest.id, {
        protocol: "websocket",
        status: "error",
        error: errorMessage,
      });
      setError(errorMessage);
    }
  };

  const handleSseConnect = async (): Promise<void> => {
    if (!activeRequest) {
      return;
    }

    const resolved = resolveCurrentRequest();
    if (!resolved) {
      return;
    }

    if (!resolved.sse.url.trim()) {
      setError("SSE URL is required");
      return;
    }

    setSessionState(activeRequest.id, {
      protocol: "sse",
      status: "connecting",
      error: null,
    });

    setIsBusy(true);
    try {
      const sessionId = await sseConnect(activeRequest.id, resolved.sse);
      setSessionState(activeRequest.id, {
        protocol: "sse",
        status: "connected",
        sessionId,
        error: null,
      });
    } catch (requestError) {
      const message = requestError instanceof Error ? requestError.message : "SSE connect failed";
      setSessionState(activeRequest.id, {
        protocol: "sse",
        status: "error",
        sessionId: null,
        error: message,
      });
      setError(message);
    } finally {
      setIsBusy(false);
    }
  };

  const handleSseDisconnect = async (): Promise<void> => {
    if (!activeRequest || !activeSession?.sessionId) {
      return;
    }

    setIsBusy(true);
    try {
      await sseDisconnect(activeSession.sessionId);
      setSessionState(activeRequest.id, {
        protocol: "sse",
        status: "disconnected",
        sessionId: null,
        error: null,
      });
    } catch (requestError) {
      const message = requestError instanceof Error ? requestError.message : "SSE disconnect failed";
      setError(message);
    } finally {
      setIsBusy(false);
    }
  };

  const resolutionPreview = useMemo(() => {
    if (!activeRequest) {
      return null;
    }

    return resolveRequestTemplate(activeRequest, activeEnvironmentVariables).diagnostics;
  }, [activeRequest, activeEnvironmentVariables]);

  const enabledParamCount = (activeRequest?.queryParams ?? []).filter(
    (param) => param.enabled && param.key.trim(),
  ).length;
  const enabledHeaderCount = (activeRequest?.headers ?? []).filter(
    (header) => header.enabled && header.key.trim(),
  ).length;

  if (!activeRequest) {
    return (
      <section className="flex min-w-0 flex-1 items-center justify-center p-2 sm:p-5">
        <div className="panel-surface flex max-w-lg flex-col items-center rounded-[1.2rem] px-6 py-8 text-center sm:rounded-[1.45rem] sm:px-8 sm:py-10">
          <p className="eyebrow">Request Studio</p>
          <h3 className="mt-3 text-2xl font-semibold tracking-tight text-foreground sm:text-[1.9rem]">
            Select or create a request
          </h3>
          <p className="mt-4 max-w-md text-sm leading-7 text-muted-foreground sm:text-[0.95rem]">
            Pick an existing endpoint from the sidebar or create a fresh request to start composing.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section
      data-undo-scope="workspace"
      className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden p-2.5 sm:p-2 lg:p-2"
    >
      <div className="shrink-0">
        <RequestTabs
          tabs={openTabs.map((request) => ({
            id: request.id,
            name: request.name,
            method: toTabLabel(request),
          }))}
          activeRequestId={activeRequestId}
          onSelect={setActiveRequest}
          onClose={closeRequestTab}
        />

        <div className="panel-surface mb-1.5 rounded-[1rem] p-2 sm:rounded-[1.15rem]">
          <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
            <div className="min-w-0">
              <h3 className="truncate text-sm font-semibold tracking-tight text-foreground sm:text-base">
                {activeRequest.name}
              </h3>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {activeProtocol === "http" && (
                <>
                  <span className="rounded-full border border-border/60 bg-background/45 px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.1em] text-muted-foreground">
                    Body: {activeRequest.body.type}
                  </span>
                  <span className="rounded-full border border-border/60 bg-background/45 px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.1em] text-muted-foreground">
                    {enabledParamCount} params
                  </span>
                  <span className="rounded-full border border-border/60 bg-background/45 px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.1em] text-muted-foreground">
                    {enabledHeaderCount} headers
                  </span>
                </>
              )}
            </div>
          </div>

          <div className="mb-1.5 flex flex-wrap items-center gap-1">
            {PROTOCOL_OPTIONS.map(({ value, icon: Icon }) => (
                <button
                  key={value}
                  type="button"
                  aria-pressed={activeProtocol === value}
                  onClick={() => {
                    if (value === activeProtocol) {
                      return;
                    }
                    setRequestProtocol(activeRequest.id, value);
                    setError("");
                  }}
                  className={`inline-flex h-8 items-center gap-1.5 rounded-full border px-2.5 text-[11px] font-semibold uppercase tracking-[0.08em] transition-all ${
                    activeProtocol === value
                      ? "border-primary/30 bg-primary/10 text-primary shadow-lg shadow-primary/10"
                      : "border-border/70 bg-background/45 text-muted-foreground hover:border-border hover:bg-accent/40 hover:text-foreground"
                  }`}
                >
                  <Icon size={13} />
                  {PROTOCOL_LABELS[value]}
                </button>
              ))}
          </div>

          {activeProtocol === "http" && (
            <div className="grid grid-cols-1 gap-2 lg:grid-cols-[8.2rem_minmax(0,1fr)_7.4rem]">
              <Select
                key={activeRequest.id}
                value={activeRequest.method}
                onValueChange={(value) => {
                  if (value === activeRequest.method) {
                    return;
                  }
                  updateRequest(activeRequest.id, { method: value as HttpMethod });
                }}
              >
                <SelectTrigger
                  className={`h-10 w-full shrink-0 font-semibold ${METHOD_TEXT_COLORS[activeRequest.method]}`}
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {HTTP_METHODS.map((method) => (
                    <SelectItem
                      key={method}
                      value={method}
                      className={METHOD_TEXT_COLORS[method]}
                    >
                      {method}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <EnvAutocompleteField
                value={activeRequest.url}
                onValueChange={(nextValue) =>
                  updateRequest(activeRequest.id, { url: nextValue })
                }
                placeholder="https://api.example.com"
                className="control-field h-10 w-full rounded-xl px-3 py-2 text-sm text-foreground"
                dataUndoScope="workspace"
                onKeyDown={(event) => {
                  if (
                    event.key === "Enter" &&
                    (!event.shiftKey || event.ctrlKey || event.metaKey)
                  ) {
                    event.preventDefault();
                    void handleHttpSend();
                  }
                }}
              />

              <button
                type="button"
                onClick={() => {
                  void handleHttpSend();
                }}
                disabled={isBusy}
                className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-xl bg-primary px-3.5 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/20 transition-all duration-200 hover:-translate-y-0.5 hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Send size={14} />
                {isBusy ? "Sending" : "Send"}
              </button>
            </div>
          )}

          {resolutionPreview && hasResolverIssues(resolutionPreview) && (
            <p className="mt-1.5 text-xs text-rose-300">
              {formatResolverIssues(resolutionPreview).join(" | ")}
            </p>
          )}
        </div>

        {activeProtocol === "http" && (
          <div className="mb-1.5 flex flex-wrap gap-1 rounded-[0.95rem] border border-border/70 bg-background/30 p-1">
            {(
              [
                { key: "params" as const, label: "Params", count: enabledParamCount },
                { key: "headers" as const, label: "Headers", count: enabledHeaderCount },
                { key: "auth" as const, label: "Auth" },
                { key: "body" as const, label: "Body" },
              ] as const
            ).map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveHttpTab(tab.key)}
                className={`relative inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-medium transition-all ${
                  activeHttpTab === tab.key
                    ? "bg-primary/10 text-primary shadow-lg shadow-primary/10"
                    : "text-muted-foreground hover:bg-accent/30 hover:text-foreground"
                }`}
              >
                {tab.label}
                {"count" in tab && tab.count > 0 && (
                  <span className="rounded-full border border-primary/20 bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary">
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden">
        {activeProtocol === "http" && activeHttpTab === "params" && (
          <ParamsEditor params={activeRequest.queryParams ?? []} onChange={updateQueryParams} />
        )}

        {activeProtocol === "http" && activeHttpTab === "headers" && (
          <HeadersEditor
            headers={activeRequest.headers}
            onUpdate={updateHeader}
            onAdd={addHeader}
            onRemove={removeHeader}
          />
        )}

        {activeProtocol === "http" && activeHttpTab === "auth" && (
          <AuthEditor auth={activeRequest.auth} onChange={updateAuth} />
        )}

        {activeProtocol === "http" && activeHttpTab === "body" && (
          <BodyEditor body={activeRequest.body} onChange={updateBody} />
        )}

        {activeProtocol === "grpc" && (
          <GrpcRequestEditor
            request={activeRequest}
            methods={activeGrpcMethods}
            loadingMethods={loadingGrpcMethods}
            onUpdateGrpc={(partial) => updateGrpcConfig(activeRequest.id, partial)}
            onImportProto={handleGrpcImportProto}
            onRefreshMethods={handleGrpcRefreshMethods}
            onCall={handleGrpcCall}
            isSending={isBusy}
          />
        )}

        {activeProtocol === "websocket" && (
          <WebSocketRequestEditor
            request={activeRequest}
            session={activeSession}
            isBusy={isBusy}
            onUpdateWebSocket={(partial) => updateWebSocketConfig(activeRequest.id, partial)}
            onConnect={handleWebSocketConnect}
            onDisconnect={handleWebSocketDisconnect}
            onSendMessage={handleWebSocketSend}
          />
        )}

        {activeProtocol === "sse" && (
          <SseRequestEditor
            request={activeRequest}
            session={activeSession}
            isBusy={isBusy}
            onUpdateSse={(partial) => updateSseConfig(activeRequest.id, partial)}
            onConnect={handleSseConnect}
            onDisconnect={handleSseDisconnect}
          />
        )}

        {error && <div className="mt-3 text-sm text-rose-300">{error}</div>}
      </div>
    </section>
  );
};
