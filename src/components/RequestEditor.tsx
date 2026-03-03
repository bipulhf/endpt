import { Send } from "lucide-react";
import { ReactElement, useMemo, useState } from "react";
import { executeHttpRequest } from "../services/ipc";
import { useWorkspaceStore } from "../store/useWorkspaceStore";
import { HeaderRow, HttpMethod, HttpResponse } from "../types";

interface RequestEditorProps {
  onResponse: (response: HttpResponse) => void;
  isSending: boolean;
  setIsSending: (value: boolean) => void;
}

const methods: HttpMethod[] = ["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"];

const createHeader = (): HeaderRow => ({
  id: typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : Math.random().toString(36).slice(2),
  key: "",
  value: "",
  enabled: true,
});

export const RequestEditor = ({ onResponse, isSending, setIsSending }: RequestEditorProps): ReactElement => {
  const activeRequestId = useWorkspaceStore((state) => state.activeRequestId);
  const workspace = useWorkspaceStore((state) => state.workspace);
  const updateRequest = useWorkspaceStore((state) => state.updateRequest);
  const [activeTab, setActiveTab] = useState<"headers" | "body">("headers");
  const [error, setError] = useState("");

  const activeRequest = useMemo(() => {
    for (const folder of workspace.folders) {
      const found = folder.requests.find((request) => request.id === activeRequestId);
      if (found) {
        return found;
      }
    }
    return null;
  }, [workspace.folders, activeRequestId]);

  const updateHeader = (headerId: string, key: keyof HeaderRow, value: string | boolean): void => {
    if (!activeRequest) {
      return;
    }

    const headers = activeRequest.headers.map((header) =>
      header.id === headerId ? { ...header, [key]: value } : header,
    );

    updateRequest(activeRequest.id, { headers });
  };

  const addHeader = (): void => {
    if (!activeRequest) {
      return;
    }
    updateRequest(activeRequest.id, { headers: [...activeRequest.headers, createHeader()] });
  };

  const removeHeader = (headerId: string): void => {
    if (!activeRequest) {
      return;
    }

    const headers = activeRequest.headers.filter((header) => header.id !== headerId);
    updateRequest(activeRequest.id, { headers });
  };

  const handleSend = async (): Promise<void> => {
    if (!activeRequest || !activeRequest.url.trim()) {
      return;
    }

    setIsSending(true);
    setError("");

    try {
      const response = await executeHttpRequest(activeRequest);
      onResponse(response);
    } catch (requestError) {
      const message = requestError instanceof Error ? requestError.message : "Request failed";
      setError(message);
    } finally {
      setIsSending(false);
    }
  };

  if (!activeRequest) {
    return (
      <section className="flex flex-1 items-center justify-center text-gray-400">
        Select or create a request to start editing.
      </section>
    );
  }

  return (
    <section className="flex min-h-0 flex-1 flex-col overflow-hidden p-4">
      <div className="mb-3 flex items-center gap-2">
        <select
          value={activeRequest.method}
          onChange={(event) => updateRequest(activeRequest.id, { method: event.target.value as HttpMethod })}
          className="rounded border border-gray-700 bg-gray-900 px-2 py-2 text-sm text-gray-100 outline-none focus:border-indigo-500"
        >
          {methods.map((method) => (
            <option key={method} value={method}>
              {method}
            </option>
          ))}
        </select>

        <input
          value={activeRequest.url}
          onChange={(event) => updateRequest(activeRequest.id, { url: event.target.value })}
          placeholder="https://api.example.com"
          className="w-full rounded border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-gray-100 outline-none focus:border-indigo-500"
        />

        <button
          type="button"
          onClick={() => {
            void handleSend();
          }}
          disabled={isSending}
          className="inline-flex items-center gap-1 rounded bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Send size={14} />
          {isSending ? "Sending" : "Send"}
        </button>
      </div>

      <input
        value={activeRequest.name}
        onChange={(event) => updateRequest(activeRequest.id, { name: event.target.value })}
        placeholder="Request name"
        className="mb-3 rounded border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-gray-100 outline-none focus:border-indigo-500"
      />

      <div className="mb-2 flex border-b border-gray-800">
        <button
          type="button"
          onClick={() => setActiveTab("headers")}
          className={`px-3 py-2 text-sm ${activeTab === "headers" ? "border-b-2 border-indigo-500 text-indigo-300" : "text-gray-400"}`}
        >
          Headers
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("body")}
          className={`px-3 py-2 text-sm ${activeTab === "body" ? "border-b-2 border-indigo-500 text-indigo-300" : "text-gray-400"}`}
        >
          Body
        </button>
      </div>

      {activeTab === "headers" && (
        <div className="min-h-0 flex-1 overflow-auto rounded border border-gray-800 bg-gray-900 p-3">
          <div className="mb-2 grid grid-cols-[40px_1fr_1fr_40px] gap-2 text-xs uppercase text-gray-400">
            <span>On</span>
            <span>Key</span>
            <span>Value</span>
            <span />
          </div>

          {activeRequest.headers.map((header) => (
            <div key={header.id} className="mb-2 grid grid-cols-[40px_1fr_1fr_40px] gap-2">
              <input
                type="checkbox"
                checked={header.enabled}
                onChange={(event) => updateHeader(header.id, "enabled", event.target.checked)}
                className="mt-2 h-4 w-4"
              />
              <input
                value={header.key}
                onChange={(event) => updateHeader(header.id, "key", event.target.value)}
                placeholder="Content-Type"
                className="rounded border border-gray-700 bg-gray-950 px-2 py-2 text-sm text-gray-100 outline-none focus:border-indigo-500"
              />
              <input
                value={header.value}
                onChange={(event) => updateHeader(header.id, "value", event.target.value)}
                placeholder="application/json"
                className="rounded border border-gray-700 bg-gray-950 px-2 py-2 text-sm text-gray-100 outline-none focus:border-indigo-500"
              />
              <button
                type="button"
                onClick={() => removeHeader(header.id)}
                className="rounded border border-gray-700 bg-gray-950 px-2 py-2 text-xs text-gray-300 hover:bg-gray-800"
              >
                X
              </button>
            </div>
          ))}

          <button
            type="button"
            onClick={addHeader}
            className="rounded border border-gray-700 bg-gray-950 px-3 py-2 text-xs text-gray-200 hover:bg-gray-800"
          >
            + Add Header
          </button>
        </div>
      )}

      {activeTab === "body" && (
        <textarea
          value={activeRequest.body}
          onChange={(event) => updateRequest(activeRequest.id, { body: event.target.value })}
          placeholder={'{\n  "key": "value"\n}'}
          className="mono min-h-0 flex-1 resize-none rounded border border-gray-800 bg-gray-900 p-3 text-sm text-gray-100 outline-none focus:border-indigo-500"
        />
      )}

      {error && <div className="mt-2 text-sm text-red-300">{error}</div>}
    </section>
  );
};
