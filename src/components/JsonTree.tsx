import { ChevronDown, ChevronRight } from "lucide-react";
import { ReactElement, useCallback, useState } from "react";

type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };

interface JsonNodeProps {
  keyName?: string;
  value: JsonValue;
  depth: number;
  defaultExpanded?: boolean;
}

const isExpandable = (
  value: JsonValue,
): value is JsonValue[] | Record<string, JsonValue> =>
  value !== null && typeof value === "object";

const getPreview = (value: JsonValue): string => {
  if (Array.isArray(value)) return `Array(${value.length})`;
  if (value !== null && typeof value === "object") {
    const keys = Object.keys(value);
    return `{${keys.length > 0 ? ` ${keys.slice(0, 3).join(", ")}${keys.length > 3 ? ", ..." : ""} ` : ""}}`;
  }
  return "";
};

const ValueDisplay = ({ value }: { value: JsonValue }): ReactElement => {
  if (value === null)
    return <span className="text-muted-foreground italic">null</span>;
  if (typeof value === "boolean")
    return <span className="text-sky-300">{value ? "true" : "false"}</span>;
  if (typeof value === "number")
    return <span className="text-amber-300">{value}</span>;
  if (typeof value === "string")
    return (
      <span className="text-emerald-700 dark:text-emerald-400">
        "{value.length > 200 ? value.slice(0, 200) + "…" : value}"
      </span>
    );
  return <></>;
};

const JsonNode = ({
  keyName,
  value,
  depth,
  defaultExpanded = true,
}: JsonNodeProps): ReactElement => {
  const [expanded, setExpanded] = useState(defaultExpanded && depth < 3);
  const expandable = isExpandable(value);

  const toggle = useCallback(() => setExpanded((prev) => !prev), []);

  const entries = expandable
    ? Array.isArray(value)
      ? value.map((v, i) => [String(i), v] as const)
      : Object.entries(value)
    : [];

  return (
    <div
      className="leading-relaxed"
      style={{ paddingLeft: depth > 0 ? 16 : 0 }}
    >
      <div className="group flex items-start gap-1">
        {expandable ? (
          <button
            type="button"
            onClick={toggle}
            className="mt-0.5 flex-shrink-0 rounded-md p-0.5 text-muted-foreground transition-colors hover:bg-accent/40"
          >
            {expanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
          </button>
        ) : (
          <span className="inline-block w-5" />
        )}

        <span className="flex flex-wrap items-baseline gap-1 text-xs">
          {keyName !== undefined && (
            <>
              <span className="font-medium text-foreground">"{keyName}"</span>
              <span className="text-muted-foreground">:</span>
            </>
          )}
          {expandable && !expanded && (
            <button
              type="button"
              onClick={toggle}
              className="rounded-md px-1 text-muted-foreground transition-colors hover:bg-accent/40 hover:text-foreground"
            >
              {getPreview(value)}
            </button>
          )}
          {expandable && expanded && (
            <span className="text-muted-foreground">
              {Array.isArray(value) ? "[" : "{"}
            </span>
          )}
          {!expandable && <ValueDisplay value={value} />}
        </span>
      </div>

      {expandable && expanded && (
        <>
          {entries.map(([k, v]) => (
            <JsonNode
              key={k}
              keyName={Array.isArray(value) ? undefined : k}
              value={v}
              depth={depth + 1}
              defaultExpanded={depth < 2}
            />
          ))}
          <div style={{ paddingLeft: 20 }}>
            <span className="text-xs text-muted-foreground">
              {Array.isArray(value) ? "]" : "}"}
            </span>
          </div>
        </>
      )}
    </div>
  );
};

interface JsonTreeProps {
  data: string;
}

export const JsonTree = ({ data }: JsonTreeProps): ReactElement => {
  try {
    const parsed = JSON.parse(data) as JsonValue;
    return (
      <div className="rounded-[1.2rem] border border-border/60 bg-background/40 p-3 font-mono text-xs">
        <JsonNode value={parsed} depth={0} defaultExpanded />
      </div>
    );
  } catch {
    return (
      <pre className="whitespace-pre-wrap break-words text-xs text-foreground">
        {data}
      </pre>
    );
  }
};
