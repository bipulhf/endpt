import { Copy, Loader2, Send, Trash2 } from "lucide-react";
import { ReactElement, useMemo, useState } from "react";
import { toast } from "sonner";
import { JsonTree } from "./JsonTree";
import { Badge } from "./ui/badge";
import { formatBytes, getStatusText } from "../lib/utils";
import { useRealtimeStore } from "../store/useRealtimeStore";
import { useWorkspaceStore } from "../store/useWorkspaceStore";
import { GrpcUnaryResponse, HttpResponse, StreamEvent } from "../types";

interface ResponsePaneProps {
  isBusy: boolean;
}

const statusClass = (
  status: number,
): "success" | "info" | "warning" | "danger" => {
  if (status >= 200 && status < 300) return "success";
  if (status >= 300 && status < 400) return "info";
  if (status >= 400 && status < 500) return "warning";
  return "danger";
};

const grpcStatusClass = (
  statusCode: number,
): "success" | "info" | "warning" | "danger" => {
  if (statusCode === 0) return "success";
  if (statusCode <= 4) return "warning";
  return "danger";
};

const isJson = (body: string): boolean => {
  try {
    JSON.parse(body);
    return true;
  } catch {
    return false;
  }
};

const formatTimestamp = (timestampMs: number): string => {
  return new Date(timestampMs).toLocaleTimeString();
};

const copyText = async (value: string, success: string): Promise<void> => {
  try {
    await navigator.clipboard.writeText(value);
    toast.success(success);
  } catch {
    toast.error("Failed to copy");
  }
};

const HttpResponseView = ({
  response,
  isBusy,
}: {
  response: HttpResponse | null;
  isBusy: boolean;
}): ReactElement => {
  const [activeTab, setActiveTab] = useState<"body" | "headers">("body");
  const [bodyView, setBodyView] = useState<"pretty" | "raw">("pretty");

  const formattedBody = useMemo(() => {
    if (!response) return "";
    try {
      const parsed = JSON.parse(response.body) as object | string | number | boolean | null;
      return JSON.stringify(parsed, null, 2);
    } catch {
      return response.body;
    }
  }, [response]);

  const headerEntries = useMemo(() => {
    if (!response) return [];
    return Object.entries(response.headers).sort(([a], [b]) => a.localeCompare(b));
  }, [response]);

  return (
    <>
      <div className="flex flex-wrap items-center gap-1.5 border-b border-border/70 px-2.5 py-2 sm:px-3 sm:py-2.5">
        {response && (
          <>
            <Badge variant={statusClass(response.status)}>
              {response.status} {getStatusText(response.status)}
            </Badge>
            <Badge variant="muted">{response.elapsed_ms} ms</Badge>
            <Badge variant="muted">{formatBytes(response.size_bytes)}</Badge>
          </>
        )}

        <div className="ml-auto flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => setActiveTab("body")}
            className={`rounded-lg px-2.5 py-1.5 text-xs font-medium transition-all ${
              activeTab === "body"
                ? "bg-primary/10 text-primary shadow-lg shadow-primary/10"
                : "text-muted-foreground hover:bg-accent/40 hover:text-foreground"
            }`}
          >
            Body
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("headers")}
            className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-all ${
              activeTab === "headers"
                ? "bg-primary/10 text-primary shadow-lg shadow-primary/10"
                : "text-muted-foreground hover:bg-accent/40 hover:text-foreground"
            }`}
          >
            Headers
            {response && (
              <span className="rounded-full border border-border/60 bg-background/50 px-1.5 py-0.5 text-[10px] text-muted-foreground">
                {headerEntries.length}
              </span>
            )}
          </button>

          {activeTab === "body" && response && (
            <>
              <div className="mx-1 hidden h-4 w-px bg-border sm:block" />
              <button
                type="button"
                onClick={() =>
                  setBodyView((current) => (current === "pretty" ? "raw" : "pretty"))
                }
                className={`rounded-lg px-2.5 py-1.5 text-xs font-medium transition-all ${
                  bodyView === "pretty"
                    ? "bg-muted/70 text-foreground"
                    : "text-muted-foreground hover:bg-accent/40"
                }`}
              >
                {bodyView === "pretty" ? "Pretty" : "Raw"}
              </button>
              <button
                type="button"
                onClick={() => {
                  void copyText(response.body, "Response body copied");
                }}
                className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-accent/40 hover:text-foreground"
                title="Copy response"
              >
                <Copy size={13} />
              </button>
            </>
          )}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-auto p-1.5 sm:p-2">
        {isBusy && (
          <div className="flex flex-col items-center justify-center gap-2 py-12 text-muted-foreground">
            <Loader2 size={24} className="animate-spin" />
            <span className="text-sm">Sending request...</span>
          </div>
        )}

        {!isBusy && !response && (
          <div className="flex flex-col items-center justify-center gap-2 py-12 text-muted-foreground">
            <Send size={24} />
            <span className="text-sm">Send request to view HTTP response</span>
          </div>
        )}

        {!isBusy && response && activeTab === "body" && (
          <>
            {bodyView === "pretty" && isJson(response.body) ? (
              <JsonTree data={response.body} />
            ) : (
              <pre className="whitespace-pre-wrap break-words rounded-[1rem] border border-border/60 bg-background/40 p-2 text-xs text-foreground">
                {bodyView === "raw" ? response.body : formattedBody}
              </pre>
            )}
          </>
        )}

        {!isBusy && response && activeTab === "headers" && (
          <div className="overflow-x-auto rounded-[1rem] border border-border/70 bg-background/30">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border/70 bg-muted/40">
                  <th className="px-3 py-2 text-left font-medium uppercase tracking-[0.16em] text-muted-foreground">
                    Name
                  </th>
                  <th className="px-3 py-2 text-left font-medium uppercase tracking-[0.16em] text-muted-foreground">
                    Value
                  </th>
                </tr>
              </thead>
              <tbody>
                {headerEntries.map(([name, value]) => (
                  <tr
                    key={name}
                    className="border-b border-border/60 last:border-0 hover:bg-accent/20"
                  >
                    <td className="px-3 py-2 font-medium text-foreground">{name}</td>
                    <td
                      className="max-w-[300px] truncate px-3 py-2 text-muted-foreground"
                      title={value}
                    >
                      {value}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
};

const GrpcResponseView = ({
  response,
  isBusy,
}: {
  response: GrpcUnaryResponse | null;
  isBusy: boolean;
}): ReactElement => {
  const [activeTab, setActiveTab] = useState<"body" | "headers" | "trailers">("body");
  const [bodyView, setBodyView] = useState<"pretty" | "raw">("pretty");

  const formattedBody = useMemo(() => {
    if (!response) return "";
    try {
      const parsed = JSON.parse(response.body) as object | string | number | boolean | null;
      return JSON.stringify(parsed, null, 2);
    } catch {
      return response.body;
    }
  }, [response]);

  const headers = useMemo(() => {
    if (!response) return [];
    return Object.entries(response.headers).sort(([a], [b]) => a.localeCompare(b));
  }, [response]);

  const trailers = useMemo(() => {
    if (!response) return [];
    return Object.entries(response.trailers).sort(([a], [b]) => a.localeCompare(b));
  }, [response]);

  const rows = activeTab === "headers" ? headers : trailers;

  return (
    <>
      <div className="flex flex-wrap items-center gap-1.5 border-b border-border/70 px-2.5 py-2 sm:px-3 sm:py-2.5">
        {response && (
          <>
            <Badge variant={grpcStatusClass(response.status_code)}>
              gRPC {response.status_code} {response.status_text}
            </Badge>
            <Badge variant="muted">{response.elapsed_ms} ms</Badge>
            <Badge variant="muted">{formatBytes(response.size_bytes)}</Badge>
          </>
        )}

        <div className="ml-auto flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => setActiveTab("body")}
            className={`rounded-lg px-2.5 py-1.5 text-xs font-medium transition-all ${
              activeTab === "body"
                ? "bg-primary/10 text-primary shadow-lg shadow-primary/10"
                : "text-muted-foreground hover:bg-accent/40 hover:text-foreground"
            }`}
          >
            Body
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("headers")}
            className={`rounded-lg px-2.5 py-1.5 text-xs font-medium transition-all ${
              activeTab === "headers"
                ? "bg-primary/10 text-primary shadow-lg shadow-primary/10"
                : "text-muted-foreground hover:bg-accent/40 hover:text-foreground"
            }`}
          >
            Headers
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("trailers")}
            className={`rounded-lg px-2.5 py-1.5 text-xs font-medium transition-all ${
              activeTab === "trailers"
                ? "bg-primary/10 text-primary shadow-lg shadow-primary/10"
                : "text-muted-foreground hover:bg-accent/40 hover:text-foreground"
            }`}
          >
            Trailers
          </button>

          {activeTab === "body" && response && (
            <>
              <div className="mx-1 hidden h-4 w-px bg-border sm:block" />
              <button
                type="button"
                onClick={() =>
                  setBodyView((current) => (current === "pretty" ? "raw" : "pretty"))
                }
                className={`rounded-lg px-2.5 py-1.5 text-xs font-medium transition-all ${
                  bodyView === "pretty"
                    ? "bg-muted/70 text-foreground"
                    : "text-muted-foreground hover:bg-accent/40"
                }`}
              >
                {bodyView === "pretty" ? "Pretty" : "Raw"}
              </button>
              <button
                type="button"
                onClick={() => {
                  void copyText(response.body, "gRPC response copied");
                }}
                className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-accent/40 hover:text-foreground"
                title="Copy response"
              >
                <Copy size={13} />
              </button>
            </>
          )}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-auto p-1.5 sm:p-2">
        {isBusy && (
          <div className="flex flex-col items-center justify-center gap-2 py-12 text-muted-foreground">
            <Loader2 size={24} className="animate-spin" />
            <span className="text-sm">Calling gRPC method...</span>
          </div>
        )}

        {!isBusy && !response && (
          <div className="flex flex-col items-center justify-center gap-2 py-12 text-muted-foreground">
            <Send size={24} />
            <span className="text-sm">Call method to view gRPC response</span>
          </div>
        )}

        {!isBusy && response && activeTab === "body" && (
          <>
            {bodyView === "pretty" && isJson(response.body) ? (
              <JsonTree data={response.body} />
            ) : (
              <pre className="whitespace-pre-wrap break-words rounded-[1rem] border border-border/60 bg-background/40 p-2 text-xs text-foreground">
                {bodyView === "raw" ? response.body : formattedBody}
              </pre>
            )}
          </>
        )}

        {!isBusy && response && activeTab !== "body" && (
          <div className="overflow-x-auto rounded-[1rem] border border-border/70 bg-background/30">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border/70 bg-muted/40">
                  <th className="px-3 py-2 text-left font-medium uppercase tracking-[0.16em] text-muted-foreground">
                    Name
                  </th>
                  <th className="px-3 py-2 text-left font-medium uppercase tracking-[0.16em] text-muted-foreground">
                    Value
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map(([name, value]) => (
                  <tr
                    key={name}
                    className="border-b border-border/60 last:border-0 hover:bg-accent/20"
                  >
                    <td className="px-3 py-2 font-medium text-foreground">{name}</td>
                    <td
                      className="max-w-[300px] truncate px-3 py-2 text-muted-foreground"
                      title={value}
                    >
                      {value}
                    </td>
                  </tr>
                ))}
                {rows.length === 0 && (
                  <tr>
                    <td colSpan={2} className="px-3 py-6 text-center text-muted-foreground">
                      No {activeTab} available.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
};

const directionBadgeClass: Record<StreamEvent["direction"], string> = {
  inbound:
    "border-emerald-600/20 bg-emerald-600/10 text-emerald-700 dark:border-emerald-400/20 dark:bg-emerald-400/10 dark:text-emerald-300",
  outbound:
    "border-sky-600/20 bg-sky-600/10 text-sky-700 dark:border-sky-400/20 dark:bg-sky-400/10 dark:text-sky-300",
  status:
    "border-slate-600/20 bg-slate-600/10 text-slate-700 dark:border-slate-400/20 dark:bg-slate-400/10 dark:text-slate-300",
  error:
    "border-rose-600/20 bg-rose-600/10 text-rose-700 dark:border-rose-400/20 dark:bg-rose-400/10 dark:text-rose-300",
};

const StreamTimelineView = ({
  events,
  isBusy,
  sessionStatus,
  clear,
}: {
  events: StreamEvent[];
  isBusy: boolean;
  sessionStatus: string;
  clear: () => void;
}): ReactElement => {
  const statusVariant =
    sessionStatus === "connected"
      ? "success"
      : sessionStatus === "error"
        ? "danger"
        : "muted";

  const copyTimeline = async (): Promise<void> => {
    const text = events
      .map(
        (event) =>
          `${formatTimestamp(event.timestamp_ms)} [${event.direction}] ${
            event.event_type ? `${event.event_type} ` : ""
          }${event.payload}`,
      )
      .join("\n");

    await copyText(text, "Timeline copied");
  };

  return (
    <>
      <div className="flex flex-wrap items-center gap-1.5 border-b border-border/70 px-2.5 py-2 sm:px-3 sm:py-2.5">
        <Badge variant={statusVariant as "success" | "danger" | "muted"}>
          Status: {sessionStatus}
        </Badge>
        <Badge variant="muted">{events.length} events</Badge>

        <div className="ml-auto flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => {
              void copyTimeline();
            }}
            className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-accent/40 hover:text-foreground"
            title="Copy timeline"
            disabled={events.length === 0}
          >
            <Copy size={13} />
          </button>
          <button
            type="button"
            onClick={clear}
            className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-accent/40 hover:text-foreground"
            title="Clear timeline"
            disabled={events.length === 0}
          >
            <Trash2 size={13} />
          </button>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-auto p-1.5 sm:p-2">
        {isBusy && sessionStatus === "connecting" && (
          <div className="flex flex-col items-center justify-center gap-2 py-12 text-muted-foreground">
            <Loader2 size={24} className="animate-spin" />
            <span className="text-sm">Connecting...</span>
          </div>
        )}

        {events.length === 0 && (
          <div className="flex flex-col items-center justify-center gap-2 py-12 text-muted-foreground">
            <Send size={24} />
            <span className="text-sm">Connect to start receiving stream events</span>
          </div>
        )}

        {events.length > 0 && (
          <div className="space-y-1.5">
            {events.map((event, index) => (
              <div
                key={`${event.session_id}-${event.timestamp_ms}-${index}`}
                className="rounded-xl border border-border/70 bg-background/35 p-2"
              >
                <div className="mb-1.5 flex flex-wrap items-center gap-1.5">
                  <span
                    className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] ${directionBadgeClass[event.direction]}`}
                  >
                    {event.direction}
                  </span>
                  <span className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
                    {formatTimestamp(event.timestamp_ms)}
                  </span>
                  {event.event_type && (
                    <span className="rounded-full border border-border/60 bg-background/50 px-2 py-0.5 text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
                      {event.event_type}
                    </span>
                  )}
                </div>

                <pre className="whitespace-pre-wrap break-words text-xs text-foreground">
                  {event.payload}
                </pre>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
};

export const ResponsePane = ({ isBusy }: ResponsePaneProps): ReactElement => {
  const activeRequestId = useWorkspaceStore((state) => state.activeRequestId);
  const folders = useWorkspaceStore((state) => state.workspace.folders);

  const activeRequest = useMemo(() => {
    if (!activeRequestId) {
      return null;
    }

    for (const folder of folders) {
      const request = folder.requests.find((item) => item.id === activeRequestId);
      if (request) {
        return request;
      }
    }

    return null;
  }, [activeRequestId, folders]);

  const session = useRealtimeStore((state) =>
    activeRequest ? state.sessionsByRequest[activeRequest.id] ?? null : null,
  );
  const events = useRealtimeStore((state) =>
    activeRequest ? state.eventsByRequest[activeRequest.id] ?? [] : [],
  );
  const clearEvents = useRealtimeStore((state) => state.clearEvents);

  if (!activeRequest) {
    return (
      <section className="flex h-full min-w-0 flex-col overflow-y-auto overflow-x-hidden">
        <div className="panel-surface-strong flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-none border-0">
          <div className="flex min-h-0 flex-1 items-center justify-center px-4 py-10 text-muted-foreground">
            <div className="text-center">
              <Send className="mx-auto mb-2" size={24} />
              <p className="text-sm">Select a request to inspect responses.</p>
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="flex h-full min-w-0 flex-col overflow-y-auto overflow-x-hidden">
      <div className="panel-surface-strong flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-none border-0">
        {activeRequest.protocol === "http" && (
          <HttpResponseView response={activeRequest.lastResponse ?? null} isBusy={isBusy} />
        )}

        {activeRequest.protocol === "grpc" && (
          <GrpcResponseView response={activeRequest.lastGrpcResponse ?? null} isBusy={isBusy} />
        )}

        {(activeRequest.protocol === "websocket" || activeRequest.protocol === "sse") && (
          <StreamTimelineView
            events={events}
            isBusy={isBusy}
            sessionStatus={session?.status ?? "disconnected"}
            clear={() => clearEvents(activeRequest.id)}
          />
        )}
      </div>
    </section>
  );
};
