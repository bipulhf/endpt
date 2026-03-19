import { Plus, Trash2 } from "lucide-react";
import { ReactElement } from "react";
import { createId } from "../lib/utils";
import { QueryParam } from "../types";
import { EnvAutocompleteField } from "./EnvAutocompleteField";

interface ParamsEditorProps {
  params: QueryParam[];
  onChange: (params: QueryParam[]) => void;
}

const createParam = (): QueryParam => ({
  id: createId(),
  key: "",
  value: "",
  enabled: true,
});

export const ParamsEditor = ({
  params,
  onChange,
}: ParamsEditorProps): ReactElement => {
  const updateParam = (
    id: string,
    field: keyof QueryParam,
    value: string | boolean,
  ): void => {
    onChange(params.map((p) => (p.id === id ? { ...p, [field]: value } : p)));
  };

  const removeParam = (id: string): void => {
    onChange(params.filter((p) => p.id !== id));
  };

  const addParam = (): void => {
    onChange([...params, createParam()]);
  };

  return (
    <div className="panel-surface-strong min-h-0 min-w-0 flex-1 overflow-auto rounded-[1rem] p-2.5 sm:rounded-[1.2rem]">
      <div className="space-y-2 sm:hidden">
        {params.map((param) => (
          <div
            key={param.id}
            className="rounded-xl border border-border/70 bg-background/35 p-2.5"
          >
            <div className="mb-2 flex items-center justify-between gap-2">
              <label className="inline-flex items-center gap-2 text-xs text-muted-foreground">
                <input
                  type="checkbox"
                  checked={param.enabled}
                  onChange={(e) =>
                    updateParam(param.id, "enabled", e.target.checked)
                  }
                  className="h-4 w-4 rounded border-input accent-primary"
                />
                Enabled
              </label>
              <button
                type="button"
                onClick={() => removeParam(param.id)}
                className="rounded-lg border border-input/80 bg-background/70 px-2.5 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-rose-500/10 hover:text-rose-300"
                aria-label="Remove param"
              >
                Remove
              </button>
            </div>
            <div className="space-y-2">
              <EnvAutocompleteField
                value={param.key}
                onValueChange={(value) => updateParam(param.id, "key", value)}
                placeholder="key"
                className="control-field rounded-xl px-2.5 py-2 text-sm text-foreground"
              />
              <EnvAutocompleteField
                value={param.value}
                onValueChange={(value) => updateParam(param.id, "value", value)}
                placeholder="value"
                className="control-field rounded-xl px-2.5 py-2 text-sm text-foreground"
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

          {params.map((param) => (
            <div
              key={param.id}
              className="mb-2 grid grid-cols-[40px_minmax(10rem,1fr)_minmax(10rem,1fr)_40px] items-center gap-2"
            >
              <div className="flex justify-center">
                <input
                  type="checkbox"
                  checked={param.enabled}
                  onChange={(e) =>
                    updateParam(param.id, "enabled", e.target.checked)
                  }
                  className="h-4 w-4 rounded border-input accent-primary"
                />
              </div>
              <EnvAutocompleteField
                value={param.key}
                onValueChange={(value) => updateParam(param.id, "key", value)}
                placeholder="key"
                className="control-field rounded-xl px-2.5 py-2 text-sm text-foreground"
              />
              <EnvAutocompleteField
                value={param.value}
                onValueChange={(value) => updateParam(param.id, "value", value)}
                placeholder="value"
                className="control-field rounded-xl px-2.5 py-2 text-sm text-foreground"
              />
              <button
                type="button"
                onClick={() => removeParam(param.id)}
                className="flex items-center justify-center rounded-xl p-2 text-rose-400 transition-colors hover:bg-rose-500/10 hover:text-rose-300"
                aria-label="Remove param"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      </div>

      <button
        type="button"
        onClick={addParam}
        className="inline-flex items-center gap-1 rounded-lg border border-input/80 bg-background/70 px-2.5 py-1.5 text-xs text-foreground transition-colors hover:bg-accent/30"
      >
        <Plus size={12} />
        Add Parameter
      </button>

      {params.length === 0 && (
        <p className="mt-3 text-center text-xs text-muted-foreground">
          No query parameters. Click "Add Parameter" to start.
        </p>
      )}
    </div>
  );
};
