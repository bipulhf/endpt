import { Copy, Loader2, Send } from "lucide-react";
import { ReactElement, useMemo, useState } from "react";
import { toast } from "sonner";
import { Badge } from "./ui/badge";
import { JsonTree } from "./JsonTree";
import { formatBytes, getStatusText } from "../lib/utils";
import { HttpResponse } from "../types";

interface ResponsePaneProps {
  response: HttpResponse | null;
  isSending: boolean;
}

const statusClass = (
  status: number,
): "success" | "info" | "warning" | "danger" => {
  if (status >= 200 && status < 300) return "success";
  if (status >= 300 && status < 400) return "info";
  if (status >= 400 && status < 500) return "warning";
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

export const ResponsePane = ({
  response,
  isSending,
}: ResponsePaneProps): ReactElement => {
  const [activeTab, setActiveTab] = useState<"body" | "headers">("body");
  const [bodyView, setBodyView] = useState<"pretty" | "raw">("pretty");

  const formattedBody = useMemo(() => {
    if (!response) return "";
    try {
      const parsed = JSON.parse(response.body) as
        | object
        | string
        | number
        | boolean
        | null;
      return JSON.stringify(parsed, null, 2);
    } catch {
      return response.body;
    }
  }, [response]);

  const headerEntries = useMemo(() => {
    if (!response) return [];
    return Object.entries(response.headers).sort(([a], [b]) =>
      a.localeCompare(b),
    );
  }, [response]);

  const copyBody = async (): Promise<void> => {
    if (!response?.body) return;
    try {
      await navigator.clipboard.writeText(response.body);
      toast.success("Response body copied");
    } catch {
      toast.error("Failed to copy response body");
    }
  };

  const copyHeaderValue = async (value: string): Promise<void> => {
    try {
      await navigator.clipboard.writeText(value);
      toast.success("Copied");
    } catch {
      toast.error("Failed to copy");
    }
  };

  return (
    <section className="flex h-full min-w-0 flex-col overflow-y-auto overflow-x-hidden">
      <div className="panel-surface-strong flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-none border-0">
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
                    setBodyView((c) => (c === "pretty" ? "raw" : "pretty"))
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
                    void copyBody();
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
          {isSending && (
            <div className="flex flex-col items-center justify-center gap-2 py-12 text-muted-foreground">
              <Loader2 size={24} className="animate-spin" />
              <span className="text-sm">Sending request...</span>
            </div>
          )}

          {!isSending && !response && (
            <div className="flex flex-col items-center justify-center gap-2 py-12 text-muted-foreground">
              <Send size={24} />
              <span className="text-sm">Hit Send to see a response</span>
            </div>
          )}

          {!isSending && response && activeTab === "body" && (
            <>
              {bodyView === "pretty" && isJson(response.body) ? (
                <JsonTree data={response.body} />
              ) : (
                <pre className="rounded-[1rem] border border-border/60 bg-background/40 p-2 whitespace-pre-wrap break-words text-xs text-foreground">
                  {bodyView === "raw" ? response.body : formattedBody}
                </pre>
              )}
            </>
          )}

          {!isSending && response && activeTab === "headers" && (
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
                    <th className="w-10 px-2 py-2" />
                  </tr>
                </thead>
                <tbody>
                  {headerEntries.map(([name, value]) => (
                    <tr
                      key={name}
                      className="border-b border-border/60 last:border-0 hover:bg-accent/20"
                    >
                      <td className="px-3 py-2 font-medium text-foreground">
                        {name}
                      </td>
                      <td
                        className="max-w-[300px] truncate px-3 py-2 text-muted-foreground"
                        title={value}
                      >
                        {value}
                      </td>
                      <td className="px-2 py-2">
                        <button
                          type="button"
                          onClick={() => {
                            void copyHeaderValue(value);
                          }}
                          className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-accent/40 hover:text-foreground"
                          title="Copy value"
                        >
                          <Copy size={11} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};
