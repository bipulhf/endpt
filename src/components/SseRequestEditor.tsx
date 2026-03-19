import { Loader2, RadioTower, Unplug, Waves } from "lucide-react";
import { ReactElement } from "react";
import { ApiRequest } from "../types";
import { StreamSessionState } from "../store/useRealtimeStore";
import { EnvAutocompleteField } from "./EnvAutocompleteField";
import { KeyValueRowsEditor } from "./KeyValueRowsEditor";
import { Button } from "./ui/button";

interface SseRequestEditorProps {
  request: ApiRequest;
  session: StreamSessionState | null;
  isBusy: boolean;
  onUpdateSse: (partial: Partial<ApiRequest["sse"]>) => void;
  onConnect: () => Promise<void>;
  onDisconnect: () => Promise<void>;
}

export const SseRequestEditor = ({
  request,
  session,
  isBusy,
  onUpdateSse,
  onConnect,
  onDisconnect,
}: SseRequestEditorProps): ReactElement => {
  const isConnected = session?.status === "connected" && Boolean(session.sessionId);

  return (
    <div className="space-y-2">
      <div className="panel-surface rounded-[1rem] p-2.5 sm:rounded-[1.25rem] sm:p-3">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-semibold tracking-tight text-foreground sm:text-base">
              Server-Sent Events
            </h3>
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              Connect to an event stream and inspect incoming events in real time.
            </p>
          </div>

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
              {isBusy ? <Loader2 size={14} className="animate-spin" /> : <RadioTower size={14} />}
              Connect
            </Button>
          )}
        </div>

        <EnvAutocompleteField
          value={request.sse.url}
          onValueChange={(value) => onUpdateSse({ url: value })}
          placeholder="https://example.com/events"
          className="control-field h-10 rounded-xl px-3 py-2 text-sm text-foreground"
          dataUndoScope="workspace"
        />

        <div className="mt-2 rounded-xl border border-border/70 bg-background/35 px-2.5 py-2 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <Waves size={13} />
            <span>
              Status: {session?.status ?? "disconnected"}
              {session?.error ? ` - ${session.error}` : ""}
            </span>
          </div>
        </div>
      </div>

      <div className="panel-surface-strong rounded-[1rem] p-2.5 sm:rounded-[1.2rem]">
        <p className="mb-2 text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
          Headers
        </p>
        <KeyValueRowsEditor
          rows={request.sse.headers}
          onChange={(rows) => onUpdateSse({ headers: rows })}
          keyPlaceholder="Authorization"
          valuePlaceholder="Bearer ..."
          addLabel="Add Header"
        />
      </div>
    </div>
  );
};
