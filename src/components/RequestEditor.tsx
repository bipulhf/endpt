import { Send } from "lucide-react";
import { ReactElement, useMemo, useState } from "react";
import { open } from "@tauri-apps/plugin-dialog";
import { executeHttpRequest } from "../services/ipc";
import { useWorkspaceStore } from "../store/useWorkspaceStore";
import { BodyType, FormDataRow, HeaderRow, HttpMethod, HttpResponse, RawLanguage, RequestBody } from "../types";

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

const createFormRow = (): FormDataRow => ({
  id: typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : Math.random().toString(36).slice(2),
  key: "",
  value: "",
  type: "text",
  enabled: true,
});

const bodyTypes: BodyType[] = ["none", "json", "raw", "form-data", "x-www-form-urlencoded", "binary", "graphql"];
const rawLanguages: RawLanguage[] = ["text", "json", "xml", "html", "javascript"];

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

  const updateBody = (nextBody: RequestBody): void => {
    if (!activeRequest) {
      return;
    }

    updateRequest(activeRequest.id, { body: nextBody });
  };

  const updateCurrentBodyType = (type: BodyType): void => {
    if (!activeRequest) {
      return;
    }

    updateBody({
      ...activeRequest.body,
      type,
      rawLanguage: type === "json" ? "json" : activeRequest.body.rawLanguage,
    });
  };

  const updateFormRows = (mode: "formData" | "urlEncoded", updater: (rows: FormDataRow[]) => FormDataRow[]): void => {
    if (!activeRequest) {
      return;
    }

    updateBody({
      ...activeRequest.body,
      [mode]: updater(activeRequest.body[mode]),
    });
  };

  const selectBinaryFile = async (): Promise<void> => {
    if (!activeRequest) {
      return;
    }

    const selected = await open({ multiple: false });
    if (!selected || Array.isArray(selected)) {
      return;
    }

    updateBody({
      ...activeRequest.body,
      binaryFilePath: selected,
    });
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
      <section className="flex flex-1 items-center justify-center text-muted-foreground">
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
          className="rounded border border-input bg-background px-2 py-2 text-sm text-foreground outline-none focus:border-primary"
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
          className="w-full rounded border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
        />

        <button
          type="button"
          onClick={() => {
            void handleSend();
          }}
          disabled={isSending}
          className="inline-flex items-center gap-1 rounded bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Send size={14} />
          {isSending ? "Sending" : "Send"}
        </button>
      </div>

      <input
        value={activeRequest.name}
        onChange={(event) => updateRequest(activeRequest.id, { name: event.target.value })}
        placeholder="Request name"
        className="mb-3 rounded border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
      />

      <div className="mb-2 flex border-b border-border">
        <button
          type="button"
          onClick={() => setActiveTab("headers")}
          className={`px-3 py-2 text-sm ${activeTab === "headers" ? "border-b-2 border-primary text-primary" : "text-muted-foreground"}`}
        >
          Headers
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("body")}
          className={`px-3 py-2 text-sm ${activeTab === "body" ? "border-b-2 border-primary text-primary" : "text-muted-foreground"}`}
        >
          Body
        </button>
      </div>

      {activeTab === "headers" && (
        <div className="min-h-0 flex-1 overflow-auto rounded border border-border bg-card p-3">
          <div className="mb-2 grid grid-cols-[40px_1fr_1fr_40px] gap-2 text-xs uppercase text-muted-foreground">
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
                className="rounded border border-input bg-background px-2 py-2 text-sm text-foreground outline-none focus:border-primary"
              />
              <input
                value={header.value}
                onChange={(event) => updateHeader(header.id, "value", event.target.value)}
                placeholder="application/json"
                className="rounded border border-input bg-background px-2 py-2 text-sm text-foreground outline-none focus:border-primary"
              />
              <button
                type="button"
                onClick={() => removeHeader(header.id)}
                className="rounded border border-input bg-background px-2 py-2 text-xs text-muted-foreground hover:bg-muted"
              >
                X
              </button>
            </div>
          ))}

          <button
            type="button"
            onClick={addHeader}
            className="rounded border border-input bg-background px-3 py-2 text-xs text-foreground hover:bg-muted"
          >
            + Add Header
          </button>
        </div>
      )}

      {activeTab === "body" && (
        <div className="min-h-0 flex-1 overflow-auto rounded border border-gray-800 bg-gray-900 p-3">
          <div className="mb-3 flex flex-wrap gap-2">
            {bodyTypes.map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => updateCurrentBodyType(type)}
                className={`rounded px-2 py-1 text-xs capitalize ${activeRequest.body.type === type
                  ? "bg-indigo-600 text-white"
                  : "bg-gray-800 text-gray-300 hover:bg-gray-700"
                  }`}
              >
                {type}
              </button>
            ))}
          </div>

          {(activeRequest.body.type === "json" || activeRequest.body.type === "raw") && (
            <>
              {activeRequest.body.type === "raw" && (
                <select
                  value={activeRequest.body.rawLanguage}
                  onChange={(event) => updateBody({
                    ...activeRequest.body,
                    rawLanguage: event.target.value as RawLanguage,
                  })}
                  className="mb-2 rounded border border-gray-700 bg-gray-950 px-2 py-1 text-xs text-gray-100 outline-none focus:border-indigo-500"
                >
                  {rawLanguages.map((language) => (
                    <option key={language} value={language}>
                      {language}
                    </option>
                  ))}
                </select>
              )}
              <textarea
                value={activeRequest.body.raw}
                onChange={(event) => updateBody({
                  ...activeRequest.body,
                  raw: event.target.value,
                })}
                placeholder={activeRequest.body.type === "json" ? '{\n  "key": "value"\n}' : "Enter request body"}
                className="mono min-h-[260px] w-full resize-y rounded border border-gray-800 bg-gray-950 p-3 text-sm text-gray-100 outline-none focus:border-indigo-500"
              />
            </>
          )}

          {activeRequest.body.type === "none" && (
            <p className="py-6 text-sm text-gray-400">This request does not have a body.</p>
          )}

          {(activeRequest.body.type === "form-data" || activeRequest.body.type === "x-www-form-urlencoded") && (
            <div className="space-y-2">
              <div className={`grid gap-2 text-xs uppercase text-gray-400 ${activeRequest.body.type === "form-data" ? "grid-cols-[40px_1fr_1fr_120px_40px]" : "grid-cols-[40px_1fr_1fr_40px]"}`}>
                <span>On</span>
                <span>Key</span>
                <span>Value</span>
                {activeRequest.body.type === "form-data" ? <span>Type</span> : null}
                <span />
              </div>

              {(activeRequest.body.type === "form-data" ? activeRequest.body.formData : activeRequest.body.urlEncoded).map((row) => (
                <div
                  key={row.id}
                  className={`grid gap-2 ${activeRequest.body.type === "form-data" ? "grid-cols-[40px_1fr_1fr_120px_40px]" : "grid-cols-[40px_1fr_1fr_40px]"}`}
                >
                  <input
                    type="checkbox"
                    checked={row.enabled}
                    onChange={(event) => updateFormRows(
                      activeRequest.body.type === "form-data" ? "formData" : "urlEncoded",
                      (rows) => rows.map((current) =>
                        current.id === row.id ? { ...current, enabled: event.target.checked } : current,
                      ),
                    )}
                    className="mt-2 h-4 w-4"
                  />
                  <input
                    value={row.key}
                    onChange={(event) => updateFormRows(
                      activeRequest.body.type === "form-data" ? "formData" : "urlEncoded",
                      (rows) => rows.map((current) =>
                        current.id === row.id ? { ...current, key: event.target.value } : current,
                      ),
                    )}
                    className="rounded border border-gray-700 bg-gray-950 px-2 py-2 text-sm text-gray-100 outline-none focus:border-indigo-500"
                  />
                  <input
                    value={row.value}
                    onChange={(event) => updateFormRows(
                      activeRequest.body.type === "form-data" ? "formData" : "urlEncoded",
                      (rows) => rows.map((current) =>
                        current.id === row.id ? { ...current, value: event.target.value } : current,
                      ),
                    )}
                    className="rounded border border-gray-700 bg-gray-950 px-2 py-2 text-sm text-gray-100 outline-none focus:border-indigo-500"
                  />
                  {activeRequest.body.type === "form-data" ? (
                    <select
                      value={row.type}
                      onChange={(event) => updateFormRows("formData", (rows) =>
                        rows.map((current) =>
                          current.id === row.id ? { ...current, type: event.target.value as "text" | "file" } : current,
                        ),
                      )}
                      className="rounded border border-gray-700 bg-gray-950 px-2 py-2 text-sm text-gray-100 outline-none focus:border-indigo-500"
                    >
                      <option value="text">text</option>
                      <option value="file">file</option>
                    </select>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => updateFormRows(
                      activeRequest.body.type === "form-data" ? "formData" : "urlEncoded",
                      (rows) => rows.filter((current) => current.id !== row.id),
                    )}
                    className="rounded border border-gray-700 bg-gray-950 px-2 py-2 text-xs text-gray-300 hover:bg-gray-800"
                  >
                    X
                  </button>
                </div>
              ))}

              <button
                type="button"
                onClick={() => updateFormRows(activeRequest.body.type === "form-data" ? "formData" : "urlEncoded", (rows) => [...rows, createFormRow()])}
                className="rounded border border-gray-700 bg-gray-950 px-3 py-2 text-xs text-gray-200 hover:bg-gray-800"
              >
                + Add Row
              </button>
            </div>
          )}

          {activeRequest.body.type === "binary" && (
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => {
                  void selectBinaryFile();
                }}
                className="rounded border border-gray-700 bg-gray-950 px-3 py-2 text-xs text-gray-200 hover:bg-gray-800"
              >
                Select File
              </button>
              <p className="text-xs text-gray-400">{activeRequest.body.binaryFilePath ?? "No file selected"}</p>
            </div>
          )}

          {activeRequest.body.type === "graphql" && (
            <div className="space-y-2">
              <label className="text-xs uppercase text-gray-400">Query</label>
              <textarea
                value={activeRequest.body.graphql.query}
                onChange={(event) => updateBody({
                  ...activeRequest.body,
                  graphql: {
                    ...activeRequest.body.graphql,
                    query: event.target.value,
                  },
                })}
                className="mono min-h-[160px] w-full resize-y rounded border border-gray-800 bg-gray-950 p-3 text-sm text-gray-100 outline-none focus:border-indigo-500"
              />
              <label className="text-xs uppercase text-gray-400">Variables (JSON)</label>
              <textarea
                value={activeRequest.body.graphql.variables}
                onChange={(event) => updateBody({
                  ...activeRequest.body,
                  graphql: {
                    ...activeRequest.body.graphql,
                    variables: event.target.value,
                  },
                })}
                className="mono min-h-[120px] w-full resize-y rounded border border-gray-800 bg-gray-950 p-3 text-sm text-gray-100 outline-none focus:border-indigo-500"
              />
            </div>
          )}
        </div>
      )}

      {error && <div className="mt-2 text-sm text-red-300">{error}</div>}
    </section>
  );
};
