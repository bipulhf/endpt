import { ReactElement, useMemo, useState } from "react";
import { HttpResponse } from "../types";

interface ResponsePaneProps {
  response: HttpResponse | null;
  isSending: boolean;
}

const statusClass = (status: number): string => {
  if (status >= 200 && status < 300) {
    return "bg-green-900 text-green-400";
  }
  if (status >= 300 && status < 400) {
    return "bg-blue-900 text-blue-400";
  }
  if (status >= 400 && status < 500) {
    return "bg-amber-900 text-amber-400";
  }
  return "bg-red-900 text-red-400";
};

export const ResponsePane = ({ response, isSending }: ResponsePaneProps): ReactElement => {
  const [activeTab, setActiveTab] = useState<"body" | "headers">("body");

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

  return (
    <section className="flex h-72 flex-col border-t border-gray-800 bg-gray-950">
      <div className="flex items-center gap-2 border-b border-gray-800 px-4 py-2">
        {response && (
          <>
            <span className={`rounded px-2 py-1 text-xs font-semibold ${statusClass(response.status)}`}>
              {response.status}
            </span>
            <span className="rounded bg-gray-800 px-2 py-1 text-xs text-gray-300">
              {response.elapsed_ms} ms
            </span>
          </>
        )}
        <div className="ml-auto flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab("body")}
            className={`text-xs ${activeTab === "body" ? "text-indigo-300" : "text-gray-400"}`}
          >
            Body
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("headers")}
            className={`text-xs ${activeTab === "headers" ? "text-indigo-300" : "text-gray-400"}`}
          >
            Headers
          </button>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-auto p-3">
        {isSending && <p className="text-sm text-gray-400">Sending...</p>}

        {!isSending && !response && <p className="text-sm text-gray-400">Hit Send to see a response.</p>}

        {!isSending && response && activeTab === "body" && (
          <pre className="whitespace-pre-wrap break-words text-xs text-gray-200">{formattedBody}</pre>
        )}

        {!isSending && response && activeTab === "headers" && (
          <pre className="whitespace-pre-wrap break-words text-xs text-gray-200">
            {JSON.stringify(response.headers, null, 2)}
          </pre>
        )}
      </div>
    </section>
  );
};
