import { Copy } from "lucide-react";
import { ReactElement, useMemo, useState } from "react";
import { toast } from "sonner";
import { Badge } from "./ui/badge";
import { formatBytes, getStatusText } from "../lib/utils";
import { HttpResponse } from "../types";

interface ResponsePaneProps {
  response: HttpResponse | null;
  isSending: boolean;
}

const statusClass = (status: number): "success" | "info" | "warning" | "danger" => {
  if (status >= 200 && status < 300) {
    return "success";
  }
  if (status >= 300 && status < 400) {
    return "info";
  }
  if (status >= 400 && status < 500) {
    return "warning";
  }
  return "danger";
};

export const ResponsePane = ({ response, isSending }: ResponsePaneProps): ReactElement => {
  const [activeTab, setActiveTab] = useState<"body" | "headers">("body");
  const [bodyView, setBodyView] = useState<"pretty" | "raw">("pretty");

  const formattedBody = useMemo(() => {
    if (!response) {
      return "";
    }

    try {
      const parsed = JSON.parse(response.body) as object | string | number | boolean | null;
      return JSON.stringify(parsed, null, 2);
    } catch {
      return response.body;
    }
  }, [response]);

  const displayBody = bodyView === "raw" ? response?.body ?? "" : formattedBody;

  const copyBody = async (): Promise<void> => {
    if (!response?.body) {
      return;
    }
    try {
      await navigator.clipboard.writeText(response.body);
      toast.success("Response body copied");
    } catch {
      toast.error("Failed to copy response body");
    }
  };

  return (
    <section className="flex h-full flex-col border-t border-border bg-card">
      <div className="flex items-center gap-2 border-b border-border px-4 py-2">
        {response && (
          <>
            <Badge variant={statusClass(response.status)}>
              {response.status} {getStatusText(response.status)}
            </Badge>
            <Badge variant="muted">
              {response.elapsed_ms} ms
            </Badge>
            <Badge variant="muted">
              {formatBytes(response.size_bytes)}
            </Badge>
          </>
        )}
        <div className="ml-auto flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab("body")}
            className={`text-xs ${activeTab === "body" ? "text-primary" : "text-muted-foreground"}`}
          >
            Body
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("headers")}
            className={`text-xs ${activeTab === "headers" ? "text-primary" : "text-muted-foreground"}`}
          >
            Headers
          </button>

          {activeTab === "body" && response && (
            <>
              <button
                type="button"
                onClick={() => setBodyView((current) => (current === "pretty" ? "raw" : "pretty"))}
                className="rounded border border-border bg-background px-2 py-1 text-xs text-muted-foreground hover:text-foreground"
              >
                {bodyView === "pretty" ? "Pretty" : "Raw"}
              </button>
              <button
                type="button"
                onClick={() => {
                  void copyBody();
                }}
                className="rounded border border-border bg-background px-2 py-1 text-xs text-muted-foreground hover:text-foreground"
              >
                <Copy size={12} />
              </button>
            </>
          )}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-auto p-3">
        {isSending && <p className="text-sm text-muted-foreground">Sending...</p>}

        {!isSending && !response && <p className="text-sm text-muted-foreground">Hit Send to see a response.</p>}

        {!isSending && response && activeTab === "body" && (
          <pre className="whitespace-pre-wrap break-words text-xs text-foreground">{displayBody}</pre>
        )}

        {!isSending && response && activeTab === "headers" && (
          <pre className="whitespace-pre-wrap break-words text-xs text-foreground">
            {JSON.stringify(response.headers, null, 2)}
          </pre>
        )}
      </div>
    </section>
  );
};
