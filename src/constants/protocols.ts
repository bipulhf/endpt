import { RequestProtocol } from "../types";

export const PROTOCOL_LABELS: Record<RequestProtocol, string> = {
  http: "HTTP",
  grpc: "gRPC",
  websocket: "WebSocket",
  sse: "SSE",
};

export const PROTOCOL_BADGE_CLASSES: Record<RequestProtocol, string> = {
  http: "border-emerald-600/20 bg-emerald-600/10 text-emerald-700 dark:border-emerald-400/20 dark:bg-emerald-400/10 dark:text-emerald-400",
  grpc: "border-violet-600/20 bg-violet-600/10 text-violet-700 dark:border-violet-400/20 dark:bg-violet-400/10 dark:text-violet-300",
  websocket:
    "border-cyan-600/20 bg-cyan-600/10 text-cyan-700 dark:border-cyan-400/20 dark:bg-cyan-400/10 dark:text-cyan-300",
  sse: "border-amber-600/20 bg-amber-600/10 text-amber-700 dark:border-amber-400/20 dark:bg-amber-400/10 dark:text-amber-300",
};
