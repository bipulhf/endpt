import { Send } from "lucide-react";
import { ReactElement, useMemo, useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { open } from "@tauri-apps/plugin-dialog";
import { RequestTabs } from "./RequestTabs";
import { AuthEditor } from "./AuthEditor";
import { ParamsEditor } from "./ParamsEditor";
import { executeHttpRequest, saveLocalData } from "../services/ipc";
import { useWorkspaceStore } from "../store/useWorkspaceStore";
import { AuthConfig, BodyType, FormDataRow, HeaderRow, HttpMethod, HttpResponse, QueryParam, RawLanguage, RequestBody } from "../types";

interface RequestEditorProps {
  onResponse: (response: HttpResponse) => void;
  isSending: boolean;
  setIsSending: (value: boolean) => void;
}

const methods: HttpMethod[] = ["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"];

const methodColors: Record<HttpMethod, string> = {
  GET: "text-green-400",
  POST: "text-blue-400",
  PUT: "text-amber-400",
  PATCH: "text-purple-400",
  DELETE: "text-red-400",
  HEAD: "text-muted-foreground",
  OPTIONS: "text-muted-foreground",
};

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
  const openRequestIds = useWorkspaceStore((state) => state.openRequestIds);
  const workspace = useWorkspaceStore((state) => state.workspace);
  const updateRequest = useWorkspaceStore((state) => state.updateRequest);
  const setActiveRequest = useWorkspaceStore((state) => state.setActiveRequest);
  const closeRequestTab = useWorkspaceStore((state) => state.closeRequestTab);
  const [activeTab, setActiveTab] = useState<EditorTab>("params");
  const [error, setError] = useState("");

  type EditorTab = "params" | "headers" | "auth" | "body";

  const requestMap = useMemo(() => {
    const entries = workspace.folders.flatMap((folder) => folder.requests.map((request) => [request.id, request] as const));
    return new Map(entries);
  }, [workspace.folders]);

  const openTabs = useMemo(
    () => openRequestIds.map((id) => requestMap.get(id)).filter((item): item is NonNullable<typeof item> => Boolean(item)),
    [openRequestIds, requestMap],
  );

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
      updateRequest(activeRequest.id, { lastResponse: response });
      void saveLocalData(useWorkspaceStore.getState().workspace);
    } catch (requestError) {
      const message = requestError instanceof Error ? requestError.message : "Request failed";
      setError(message);
    } finally {
      setIsSending(false);
    }
  };

  const updateAuth = (auth: AuthConfig): void => {
    if (!activeRequest) {
      return;
    }
    updateRequest(activeRequest.id, { auth });
  };

  const updateQueryParams = (queryParams: QueryParam[]): void => {
    if (!activeRequest) {
      return;
    }
    updateRequest(activeRequest.id, { queryParams });
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
      <RequestTabs
        tabs={openTabs.map((request) => ({
          id: request.id,
          name: request.name,
          method: request.method,
        }))}
        activeRequestId={activeRequestId}
        onSelect={setActiveRequest}
        onClose={closeRequestTab}
      />

      <div className="mb-3 flex items-center gap-2">
        <Select
          key={activeRequest.id}
          value={activeRequest.method}
          onValueChange={(value) => updateRequest(activeRequest.id, { method: value as HttpMethod })}
        >
          <SelectTrigger className={`w-[120px] shrink-0 font-semibold ${methodColors[activeRequest.method]}`}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {methods.map((method) => (
              <SelectItem key={method} value={method} className={methodColors[method]}>
                {method}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <input
          value={activeRequest.url}
          onChange={(event) => updateRequest(activeRequest.id, { url: event.target.value })}
          placeholder="https://api.example.com"
          className="w-full rounded border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void handleSend();
            }
          }}
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

      {
        (() => {
          const paramCount = (activeRequest.queryParams ?? []).filter((p) => p.enabled && p.key.trim()).length;
          const headerCount = activeRequest.headers.filter((h) => h.enabled && h.key.trim()).length;
          return (
            <div className="mb-2 flex border-b border-border">
              {(
                [
                  { key: "params" as const, label: "Params", count: paramCount },
                  { key: "headers" as const, label: "Headers", count: headerCount },
                  { key: "auth" as const, label: "Auth" },
                  { key: "body" as const, label: "Body" },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setActiveTab(tab.key)}
                  className={`relative inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium transition-colors ${activeTab === tab.key
                    ? "border-b-2 border-primary text-primary"
                    : "text-muted-foreground hover:text-foreground"
                    }`}
                >
                  {tab.label}
                  {"count" in tab && tab.count > 0 && (
                    <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary">
                      {tab.count}
                    </span>
                  )}
                </button>
              ))}
            </div>
          );
        })()
      }
      {activeTab === "params" && (
        <ParamsEditor
          params={activeRequest.queryParams ?? []}
          onChange={updateQueryParams}
        />
      )}

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

      {activeTab === "auth" && (
        <AuthEditor auth={activeRequest.auth} onChange={updateAuth} />
      )}

      {activeTab === "body" && (
        <div className="min-h-0 flex-1 overflow-auto rounded border border-border bg-card p-3">
          <div className="mb-3 flex flex-wrap gap-2">
            {bodyTypes.map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => updateCurrentBodyType(type)}
                className={`rounded px-2 py-1 text-xs capitalize ${activeRequest.body.type === type
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                  }`}
              >
                {type}
              </button>
            ))}
          </div>

          {(activeRequest.body.type === "json" || activeRequest.body.type === "raw") && (
            <>
              {activeRequest.body.type === "raw" && (
                <Select
                  value={activeRequest.body.rawLanguage}
                  onValueChange={(value) => updateBody({
                    ...activeRequest.body,
                    rawLanguage: value as RawLanguage,
                  })}
                >
                  <SelectTrigger className="mb-2 w-[120px] text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {rawLanguages.map((language) => (
                      <SelectItem key={language} value={language} className="text-xs capitalize">
                        {language}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              <textarea
                value={activeRequest.body.raw}
                onChange={(event) => updateBody({
                  ...activeRequest.body,
                  raw: event.target.value,
                })}
                placeholder={activeRequest.body.type === "json" ? '{\n  "key": "value"\n}' : "Enter request body"}
                className="min-h-[260px] w-full resize-y rounded border border-input bg-background p-3 font-mono text-sm text-foreground outline-none focus:border-primary"
              />
            </>
          )}

          {activeRequest.body.type === "none" && (
            <p className="py-6 text-sm text-muted-foreground">This request does not have a body.</p>
          )}

          {(activeRequest.body.type === "form-data" || activeRequest.body.type === "x-www-form-urlencoded") && (
            <div className="space-y-2">
              <div className={`grid gap-2 text-xs uppercase text-muted-foreground ${activeRequest.body.type === "form-data" ? "grid-cols-[40px_1fr_1fr_120px_40px]" : "grid-cols-[40px_1fr_1fr_40px]"}`}>
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
                    className="rounded border border-input bg-background px-2 py-2 text-sm text-foreground outline-none focus:border-primary"
                  />
                  <input
                    value={row.value}
                    onChange={(event) => updateFormRows(
                      activeRequest.body.type === "form-data" ? "formData" : "urlEncoded",
                      (rows) => rows.map((current) =>
                        current.id === row.id ? { ...current, value: event.target.value } : current,
                      ),
                    )}
                    className="rounded border border-input bg-background px-2 py-2 text-sm text-foreground outline-none focus:border-primary"
                  />
                  {activeRequest.body.type === "form-data" ? (
                    <Select
                      value={row.type}
                      onValueChange={(value) => updateFormRows("formData", (rows) =>
                        rows.map((current) =>
                          current.id === row.id ? { ...current, type: value as "text" | "file" } : current,
                        ),
                      )}
                    >
                      <SelectTrigger className="text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="text" className="text-xs">text</SelectItem>
                        <SelectItem value="file" className="text-xs">file</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => updateFormRows(
                      activeRequest.body.type === "form-data" ? "formData" : "urlEncoded",
                      (rows) => rows.filter((current) => current.id !== row.id),
                    )}
                    className="rounded border border-input bg-background px-2 py-2 text-xs text-muted-foreground hover:bg-muted"
                  >
                    X
                  </button>
                </div>
              ))}

              <button
                type="button"
                onClick={() => updateFormRows(activeRequest.body.type === "form-data" ? "formData" : "urlEncoded", (rows) => [...rows, createFormRow()])}
                className="rounded border border-input bg-background px-3 py-2 text-xs text-foreground hover:bg-muted"
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
                className="rounded border border-input bg-background px-3 py-2 text-xs text-foreground hover:bg-muted"
              >
                Select File
              </button>
              <p className="text-xs text-muted-foreground">{activeRequest.body.binaryFilePath ?? "No file selected"}</p>
            </div>
          )}

          {activeRequest.body.type === "graphql" && (
            <div className="space-y-2">
              <label className="text-xs uppercase text-muted-foreground">Query</label>
              <textarea
                value={activeRequest.body.graphql.query}
                onChange={(event) => updateBody({
                  ...activeRequest.body,
                  graphql: {
                    ...activeRequest.body.graphql,
                    query: event.target.value,
                  },
                })}
                className="min-h-[160px] w-full resize-y rounded border border-input bg-background p-3 font-mono text-sm text-foreground outline-none focus:border-primary"
              />
              <label className="text-xs uppercase text-muted-foreground">Variables (JSON)</label>
              <textarea
                value={activeRequest.body.graphql.variables}
                onChange={(event) => updateBody({
                  ...activeRequest.body,
                  graphql: {
                    ...activeRequest.body.graphql,
                    variables: event.target.value,
                  },
                })}
                className="min-h-[120px] w-full resize-y rounded border border-input bg-background p-3 font-mono text-sm text-foreground outline-none focus:border-primary"
              />
            </div>
          )}
        </div>
      )}

      {error && <div className="mt-2 text-sm text-red-500">{error}</div>}
    </section>
  );
};
