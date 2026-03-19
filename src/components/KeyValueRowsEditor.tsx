import { Plus, Trash2 } from "lucide-react";
import { ReactElement } from "react";
import { createId } from "../lib/utils";
import { HeaderRow } from "../types";
import { EnvAutocompleteField } from "./EnvAutocompleteField";

interface KeyValueRowsEditorProps {
  rows: HeaderRow[];
  onChange: (rows: HeaderRow[]) => void;
  keyPlaceholder?: string;
  valuePlaceholder?: string;
  addLabel?: string;
}

const createRow = (): HeaderRow => ({
  id: createId(),
  key: "",
  value: "",
  enabled: true,
});

export const KeyValueRowsEditor = ({
  rows,
  onChange,
  keyPlaceholder = "Key",
  valuePlaceholder = "Value",
  addLabel = "Add Row",
}: KeyValueRowsEditorProps): ReactElement => {
  const updateRow = (
    id: string,
    field: keyof HeaderRow,
    value: string | boolean,
  ): void => {
    onChange(rows.map((row) => (row.id === id ? { ...row, [field]: value } : row)));
  };

  const removeRow = (id: string): void => {
    onChange(rows.filter((row) => row.id !== id));
  };

  const addRow = (): void => {
    onChange([...rows, createRow()]);
  };

  return (
    <div className="panel-surface-strong min-h-0 min-w-0 flex-1 overflow-auto rounded-[1rem] p-2.5 sm:rounded-[1.2rem]">
      <div className="space-y-2 sm:hidden">
        {rows.map((row) => (
          <div key={row.id} className="rounded-xl border border-border/70 bg-background/35 p-2.5">
            <div className="mb-2 flex items-center justify-between gap-2">
              <label className="inline-flex items-center gap-2 text-xs text-muted-foreground">
                <input
                  type="checkbox"
                  checked={row.enabled}
                  onChange={(event) => updateRow(row.id, "enabled", event.target.checked)}
                  className="h-4 w-4 rounded border-input accent-primary"
                />
                Enabled
              </label>
              <button
                type="button"
                onClick={() => removeRow(row.id)}
                className="rounded-lg border border-input/80 bg-background/70 px-2.5 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-rose-500/10 hover:text-rose-300"
              >
                Remove
              </button>
            </div>
            <div className="space-y-2">
              <EnvAutocompleteField
                value={row.key}
                onValueChange={(value) => updateRow(row.id, "key", value)}
                placeholder={keyPlaceholder}
                className="control-field rounded-xl px-3 py-2 text-sm text-foreground"
              />
              <EnvAutocompleteField
                value={row.value}
                onValueChange={(value) => updateRow(row.id, "value", value)}
                placeholder={valuePlaceholder}
                className="control-field rounded-xl px-3 py-2 text-sm text-foreground"
              />
            </div>
          </div>
        ))}
      </div>

      <div className="hidden overflow-x-auto sm:block">
        <div className="min-w-[34rem]">
          <div className="mb-3 grid grid-cols-[40px_minmax(10rem,1fr)_minmax(10rem,1fr)_40px] gap-2 text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
            <span>On</span>
            <span>Key</span>
            <span>Value</span>
            <span />
          </div>

          {rows.map((row) => (
            <div
              key={row.id}
              className="mb-2 grid grid-cols-[40px_minmax(10rem,1fr)_minmax(10rem,1fr)_40px] items-center gap-2"
            >
              <div className="flex justify-center">
                <input
                  type="checkbox"
                  checked={row.enabled}
                  onChange={(event) => updateRow(row.id, "enabled", event.target.checked)}
                  className="h-4 w-4 rounded border-input accent-primary"
                />
              </div>
              <EnvAutocompleteField
                value={row.key}
                onValueChange={(value) => updateRow(row.id, "key", value)}
                placeholder={keyPlaceholder}
                className="control-field rounded-xl px-2.5 py-2 text-sm text-foreground"
              />
              <EnvAutocompleteField
                value={row.value}
                onValueChange={(value) => updateRow(row.id, "value", value)}
                placeholder={valuePlaceholder}
                className="control-field rounded-xl px-2.5 py-2 text-sm text-foreground"
              />
              <button
                type="button"
                onClick={() => removeRow(row.id)}
                className="flex items-center justify-center rounded-xl p-2 text-rose-400 transition-colors hover:bg-rose-500/10 hover:text-rose-300"
                aria-label="Remove row"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      </div>

      <button
        type="button"
        onClick={addRow}
        className="inline-flex items-center gap-1 rounded-lg border border-input/80 bg-background/70 px-2.5 py-1.5 text-xs text-foreground transition-colors hover:bg-accent/30"
      >
        <Plus size={12} />
        {addLabel}
      </button>

      {rows.length === 0 && (
        <p className="mt-3 text-center text-xs text-muted-foreground">No rows added.</p>
      )}
    </div>
  );
};
