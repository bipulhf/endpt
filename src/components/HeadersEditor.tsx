import { ReactElement } from "react";
import { createId } from "../lib/utils";
import { HeaderRow } from "../types";

interface HeadersEditorProps {
  headers: HeaderRow[];
  onUpdate: (headerId: string, key: keyof HeaderRow, value: string | boolean) => void;
  onAdd: () => void;
  onRemove: (headerId: string) => void;
}

export const createHeader = (): HeaderRow => ({
  id: createId(),
  key: "",
  value: "",
  enabled: true,
});

export const HeadersEditor = ({
  headers,
  onUpdate,
  onAdd,
  onRemove,
}: HeadersEditorProps): ReactElement => (
  <div className="panel-surface-strong min-h-0 min-w-0 flex-1 overflow-auto rounded-[1rem] p-2.5 sm:rounded-[1.2rem]">
    <div className="space-y-2 sm:hidden">
      {headers.map((header) => (
        <div
          key={header.id}
          className="rounded-xl border border-border/70 bg-background/35 p-2.5"
        >
          <div className="mb-2 flex items-center justify-between gap-2">
            <label className="inline-flex items-center gap-2 text-xs text-muted-foreground">
              <input
                type="checkbox"
                checked={header.enabled}
                onChange={(event) =>
                  onUpdate(header.id, "enabled", event.target.checked)
                }
                className="h-4 w-4 rounded border-input accent-primary"
              />
              Enabled
            </label>
            <button
              type="button"
              onClick={() => onRemove(header.id)}
              className="rounded-lg border border-input/80 bg-background/70 px-2.5 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-rose-500/10 hover:text-rose-300"
            >
              Remove
            </button>
          </div>
          <div className="space-y-2">
            <input
              value={header.key}
              onChange={(event) =>
                onUpdate(header.id, "key", event.target.value)
              }
              placeholder="Content-Type"
              className="control-field rounded-xl px-3 py-2 text-sm text-foreground"
            />
            <input
              value={header.value}
              onChange={(event) =>
                onUpdate(header.id, "value", event.target.value)
              }
              placeholder="application/json"
              className="control-field rounded-xl px-3 py-2 text-sm text-foreground"
            />
          </div>
        </div>
      ))}
    </div>

    <div className="hidden overflow-x-auto sm:block">
      <div className="min-w-[34rem]">
        <div className="mb-3 grid grid-cols-[40px_minmax(10rem,1fr)_minmax(10rem,1fr)_40px] gap-2 text-xs uppercase tracking-[0.18em] text-muted-foreground">
          <span>On</span>
          <span>Key</span>
          <span>Value</span>
          <span />
        </div>

        {headers.map((header) => (
          <div
            key={header.id}
            className="mb-2 grid grid-cols-[40px_minmax(10rem,1fr)_minmax(10rem,1fr)_40px] gap-2"
          >
            <input
              type="checkbox"
              checked={header.enabled}
              onChange={(event) =>
                onUpdate(header.id, "enabled", event.target.checked)
              }
              className="mt-3 h-4 w-4 rounded border-input accent-primary"
            />
            <input
              value={header.key}
              onChange={(event) =>
                onUpdate(header.id, "key", event.target.value)
              }
              placeholder="Content-Type"
              className="control-field rounded-xl px-3 py-2.5 text-sm text-foreground"
            />
            <input
              value={header.value}
              onChange={(event) =>
                onUpdate(header.id, "value", event.target.value)
              }
              placeholder="application/json"
              className="control-field rounded-xl px-3 py-2.5 text-sm text-foreground"
            />
            <button
              type="button"
              onClick={() => onRemove(header.id)}
              className="rounded-xl border border-input/80 bg-background/70 px-2 py-2 text-xs text-muted-foreground transition-colors hover:bg-rose-500/10 hover:text-rose-300"
            >
              X
            </button>
          </div>
        ))}
      </div>
    </div>

    <button
      type="button"
      onClick={onAdd}
      className="mt-1 rounded-lg border border-input/80 bg-background/70 px-2.5 py-1.5 text-xs text-foreground transition-colors hover:bg-accent/30"
    >
      + Add Header
    </button>
  </div>
);
