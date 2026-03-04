import { Plus, Trash2 } from "lucide-react";
import { ReactElement } from "react";
import { QueryParam } from "../types";

interface ParamsEditorProps {
  params: QueryParam[];
  onChange: (params: QueryParam[]) => void;
}

const createId = (): string =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);

const createParam = (): QueryParam => ({
  id: createId(),
  key: "",
  value: "",
  enabled: true,
});

export const ParamsEditor = ({ params, onChange }: ParamsEditorProps): ReactElement => {
  const updateParam = (id: string, field: keyof QueryParam, value: string | boolean): void => {
    onChange(params.map((p) => (p.id === id ? { ...p, [field]: value } : p)));
  };

  const removeParam = (id: string): void => {
    onChange(params.filter((p) => p.id !== id));
  };

  const addParam = (): void => {
    onChange([...params, createParam()]);
  };

  return (
    <div className="min-h-0 flex-1 overflow-auto rounded border border-border bg-card p-3">
      <div className="mb-2 grid grid-cols-[40px_1fr_1fr_40px] gap-2 text-xs font-medium uppercase text-muted-foreground">
        <span>On</span>
        <span>Key</span>
        <span>Value</span>
        <span />
      </div>

      {params.map((param) => (
        <div key={param.id} className="mb-2 grid grid-cols-[40px_1fr_1fr_40px] items-center gap-2">
          <div className="flex justify-center">
            <input
              type="checkbox"
              checked={param.enabled}
              onChange={(e) => updateParam(param.id, "enabled", e.target.checked)}
              className="h-4 w-4 rounded border-input accent-primary"
            />
          </div>
          <input
            value={param.key}
            onChange={(e) => updateParam(param.id, "key", e.target.value)}
            placeholder="key"
            className="rounded border border-input bg-background px-2 py-2 text-sm text-foreground outline-none focus:border-primary"
          />
          <input
            value={param.value}
            onChange={(e) => updateParam(param.id, "value", e.target.value)}
            placeholder="value"
            className="rounded border border-input bg-background px-2 py-2 text-sm text-foreground outline-none focus:border-primary"
          />
          <button
            type="button"
            onClick={() => removeParam(param.id)}
            className="flex items-center justify-center rounded p-2 text-red-500 hover:bg-muted"
            aria-label="Remove param"
          >
            <Trash2 size={14} />
          </button>
        </div>
      ))}

      <button
        type="button"
        onClick={addParam}
        className="inline-flex items-center gap-1 rounded border border-input bg-background px-3 py-2 text-xs text-foreground hover:bg-muted"
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
