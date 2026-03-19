import { create } from "zustand";
import { StreamEvent, StreamProtocol } from "../types";

export type SessionStatus = "disconnected" | "connecting" | "connected" | "error";

export interface StreamSessionState {
  requestId: string;
  sessionId: string | null;
  protocol: StreamProtocol;
  status: SessionStatus;
  error: string | null;
}

interface RealtimeState {
  sessionsByRequest: Record<string, StreamSessionState>;
  eventsByRequest: Record<string, StreamEvent[]>;
  setSessionState: (requestId: string, partial: Partial<StreamSessionState>) => void;
  appendEvent: (event: StreamEvent) => void;
  clearEvents: (requestId: string) => void;
  clearSession: (requestId: string) => void;
}

const MAX_EVENTS_PER_REQUEST = 600;

export const useRealtimeStore = create<RealtimeState>((set) => ({
  sessionsByRequest: {},
  eventsByRequest: {},

  setSessionState: (requestId, partial) => {
    set((state) => {
      const current = state.sessionsByRequest[requestId];
      const protocol = partial.protocol ?? current?.protocol ?? "websocket";
      const next: StreamSessionState = {
        requestId,
        sessionId: partial.sessionId ?? current?.sessionId ?? null,
        protocol,
        status: partial.status ?? current?.status ?? "disconnected",
        error: partial.error ?? null,
      };

      return {
        sessionsByRequest: {
          ...state.sessionsByRequest,
          [requestId]: next,
        },
      };
    });
  },

  appendEvent: (event) => {
    set((state) => {
      const previous = state.eventsByRequest[event.request_id] ?? [];
      const next = [...previous, event];
      const trimmed =
        next.length > MAX_EVENTS_PER_REQUEST
          ? next.slice(next.length - MAX_EVENTS_PER_REQUEST)
          : next;

      return {
        eventsByRequest: {
          ...state.eventsByRequest,
          [event.request_id]: trimmed,
        },
      };
    });
  },

  clearEvents: (requestId) => {
    set((state) => ({
      eventsByRequest: {
        ...state.eventsByRequest,
        [requestId]: [],
      },
    }));
  },

  clearSession: (requestId) => {
    set((state) => {
      const { [requestId]: _, ...rest } = state.sessionsByRequest;
      return { sessionsByRequest: rest };
    });
  },
}));
