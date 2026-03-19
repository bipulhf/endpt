import { Cable, Loader2, MessageSquare, PlugZap, SendHorizonal, Unplug } from "lucide-react";
import { ReactElement } from "react";
import { ApiRequest } from "../types";
import { StreamSessionState } from "../store/useRealtimeStore";
import { EnvAutocompleteField } from "./EnvAutocompleteField";
import { KeyValueRowsEditor } from "./KeyValueRowsEditor";
import { Button } from "./ui/button";

interface WebSocketRequestEditorProps {
  request: ApiRequest;
  session: StreamSessionState | null;
  isBusy: boolean;
  onUpdateWebSocket: (partial: Partial<ApiRequest["websocket"]>) => void;
  onConnect: () => Promise<void>;
  onDisconnect: () => Promise<void>;
  onSendMessage: () => Promise<void>;
}

export const WebSocketRequestEditor = ({
  request,
  session,
  isBusy,
  onUpdateWebSocket,
  onConnect,
  onDisconnect,
  onSendMessage,
}: WebSocketRequestEditorProps): ReactElement => {
  const isConnected = session?.status === "connected" && Boolean(session.sessionId);

  return (
    <div className="space-y-2">
      <div className="panel-surface rounded-[1rem] p-2.5 sm:rounded-[1.25rem] sm:p-3">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-semibold tracking-tight text-foreground sm:text-base">
              WebSocket Session
            </h3>
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              Connect, exchange messages, and inspect the live timeline.
            </p>
          </div>

          <div className="flex items-center gap-1.5">
            {isConnected ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  void onDisconnect();
                }}
                disabled={isBusy}
                className="h-9"
              >
                <Unplug size={14} />
                Disconnect
              </Button>
            ) : (
              <Button
                size="sm"
                onClick={() => {
                  void onConnect();
                }}
                disabled={isBusy}
                className="h-9"
              >
                {isBusy ? <Loader2 size={14} className="animate-spin" /> : <PlugZap size={14} />}
                Connect
              </Button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-2 lg:grid-cols-[minmax(0,1fr)_12rem]">
          <EnvAutocompleteField
            value={request.websocket.url}
            onValueChange={(value) => onUpdateWebSocket({ url: value })}
            placeholder="wss://echo.websocket.events"
            className="control-field h-10 rounded-xl px-3 py-2 text-sm text-foreground"
            dataUndoScope="workspace"
          />

          <EnvAutocompleteField
            value={request.websocket.subprotocol}
            onValueChange={(value) => onUpdateWebSocket({ subprotocol: value })}
            placeholder="Subprotocol (optional)"
            className="control-field h-10 rounded-xl px-3 py-2 text-sm text-foreground"
            dataUndoScope="workspace"
          />
        </div>

        <div className="mt-2 rounded-xl border border-border/70 bg-background/35 px-2.5 py-2 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <Cable size={13} />
            <span>
              Status: {session?.status ?? "disconnected"}
              {session?.error ? ` - ${session.error}` : ""}
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-2 xl:grid-cols-2">
        <div className="panel-surface-strong rounded-[1rem] p-2.5 sm:rounded-[1.2rem]">
          <p className="mb-2 text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
            Headers
          </p>
          <KeyValueRowsEditor
            rows={request.websocket.headers}
            onChange={(rows) => onUpdateWebSocket({ headers: rows })}
            keyPlaceholder="Authorization"
            valuePlaceholder="Bearer ..."
            addLabel="Add Header"
          />
        </div>

        <div className="panel-surface-strong rounded-[1rem] p-2.5 sm:rounded-[1.2rem]">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
              Message Composer
            </p>
            <Button
              variant="secondary"
              size="sm"
              disabled={!isConnected || isBusy}
              onClick={() => {
                void onSendMessage();
              }}
              className="h-8"
            >
              <SendHorizonal size={13} />
              Send
            </Button>
          </div>
          <EnvAutocompleteField
            value={request.websocket.initialMessage}
            onValueChange={(value) => onUpdateWebSocket({ initialMessage: value })}
            multiline
            rows={16}
            placeholder='{"type":"ping"}'
            className="control-field min-h-[16rem] w-full resize-y rounded-[1rem] p-2.5 font-mono text-sm text-foreground"
            dataUndoScope="workspace"
          />
          <div className="mt-2 flex items-center gap-1 text-[11px] text-muted-foreground">
            <MessageSquare size={12} />
            <span>
              Supports template variables with <code>{"{{VAR_NAME}}"}</code>.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
