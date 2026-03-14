import { Send } from "lucide-react";
import { ReactElement, useMemo, useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { RequestTabs } from "./RequestTabs";
import { AuthEditor } from "./AuthEditor";
import { ParamsEditor } from "./ParamsEditor";
import { HeadersEditor, createHeader } from "./HeadersEditor";
import { BodyEditor } from "./BodyEditor";
import { executeHttpRequest, saveLocalData } from "../services/ipc";
import { useWorkspaceStore } from "../store/useWorkspaceStore";
import { HTTP_METHODS, METHOD_TEXT_COLORS } from "../constants/methods";
import {
  AuthConfig,
  HeaderRow,
  HttpMethod,
  HttpResponse,
  QueryParam,
  RequestBody,
} from "../types";

interface RequestEditorProps {
  onResponse: (response: HttpResponse) => void;
  isSending: boolean;
  setIsSending: (value: boolean) => void;
}

type EditorTab = "params" | "headers" | "auth" | "body";

export const RequestEditor = ({
  onResponse,
  isSending,
  setIsSending,
}: RequestEditorProps): ReactElement => {
  const activeRequestId = useWorkspaceStore((state) => state.activeRequestId);
  const openRequestIds = useWorkspaceStore((state) => state.openRequestIds);
  const workspace = useWorkspaceStore((state) => state.workspace);
  const updateRequest = useWorkspaceStore((state) => state.updateRequest);
  const setActiveRequest = useWorkspaceStore((state) => state.setActiveRequest);
  const closeRequestTab = useWorkspaceStore((state) => state.closeRequestTab);
  const [activeTab, setActiveTab] = useState<EditorTab>("params");
  const [error, setError] = useState("");

  const requestMap = useMemo(() => {
    const entries = workspace.folders.flatMap((folder) =>
      folder.requests.map((request) => [request.id, request] as const),
    );
    return new Map(entries);
  }, [workspace.folders]);

  const openTabs = useMemo(
    () =>
      openRequestIds
        .map((id) => requestMap.get(id))
        .filter((item): item is NonNullable<typeof item> => Boolean(item)),
    [openRequestIds, requestMap],
  );

  const activeRequest = useMemo(() => {
    for (const folder of workspace.folders) {
      const found = folder.requests.find(
        (request) => request.id === activeRequestId,
      );
      if (found) {
        return found;
      }
    }
    return null;
  }, [workspace.folders, activeRequestId]);

  const updateHeader = (
    headerId: string,
    key: keyof HeaderRow,
    value: string | boolean,
  ): void => {
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
    updateRequest(activeRequest.id, {
      headers: [...activeRequest.headers, createHeader()],
    });
  };

  const removeHeader = (headerId: string): void => {
    if (!activeRequest) {
      return;
    }

    const headers = activeRequest.headers.filter(
      (header) => header.id !== headerId,
    );
    updateRequest(activeRequest.id, { headers });
  };

  const updateBody = (nextBody: RequestBody): void => {
    if (!activeRequest) {
      return;
    }

    updateRequest(activeRequest.id, { body: nextBody });
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
      const message =
        requestError instanceof Error ? requestError.message : "Request failed";
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
      <section className="flex min-w-0 flex-1 items-center justify-center p-2 sm:p-5">
        <div className="panel-surface flex max-w-lg flex-col items-center rounded-[1.2rem] px-6 py-8 text-center sm:rounded-[1.45rem] sm:px-8 sm:py-10">
          <p className="eyebrow">Request Studio</p>
          <h3 className="mt-3 text-2xl font-semibold tracking-tight text-foreground sm:text-[1.9rem]">
            Select or create a request
          </h3>
          <p className="mt-4 max-w-md text-sm leading-7 text-muted-foreground sm:text-[0.95rem]">
            Pick an existing endpoint from the sidebar or create a fresh request
            to start composing.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden p-2.5 sm:p-2 lg:p-2">
      <div className="shrink-0">
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

        <div className="panel-surface mb-2 rounded-[1rem] p-2.5 sm:rounded-[1.25rem] sm:p-2">
          <h3 className="mb-1.5 truncate text-sm font-semibold tracking-tight text-foreground sm:text-base">
            {activeRequest.name}
          </h3>

          <div className="flex flex-col gap-2 xl:flex-row xl:items-center">
            <Select
              key={activeRequest.id}
              value={activeRequest.method}
              onValueChange={(value) =>
                updateRequest(activeRequest.id, { method: value as HttpMethod })
              }
            >
              <SelectTrigger
                className={`h-9 w-full shrink-0 font-semibold xl:w-[7.5rem] ${METHOD_TEXT_COLORS[activeRequest.method]}`}
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {HTTP_METHODS.map((method) => (
                  <SelectItem
                    key={method}
                    value={method}
                    className={METHOD_TEXT_COLORS[method]}
                  >
                    {method}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <input
              value={activeRequest.url}
              onChange={(event) =>
                updateRequest(activeRequest.id, { url: event.target.value })
              }
              placeholder="https://api.example.com"
              className="control-field h-9 w-full rounded-xl px-3 py-2 text-sm text-foreground"
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
              className="inline-flex h-9 shrink-0 items-center justify-center gap-2 rounded-xl bg-primary px-3.5 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/20 transition-all duration-200 hover:-translate-y-0.5 hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60 xl:min-w-[6.5rem]"
            >
              <Send size={14} />
              {isSending ? "Sending" : "Send"}
            </button>
          </div>
        </div>

        {(() => {
          const paramCount = (activeRequest.queryParams ?? []).filter(
            (p) => p.enabled && p.key.trim(),
          ).length;
          const headerCount = activeRequest.headers.filter(
            (h) => h.enabled && h.key.trim(),
          ).length;
          return (
            <div className="mb-2 flex flex-wrap gap-1 rounded-[0.95rem] border border-border/70 bg-background/40 p-1">
              {(
                [
                  { key: "params" as const, label: "Params", count: paramCount },
                  {
                    key: "headers" as const,
                    label: "Headers",
                    count: headerCount,
                  },
                  { key: "auth" as const, label: "Auth" },
                  { key: "body" as const, label: "Body" },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setActiveTab(tab.key)}
                  className={`relative inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-medium transition-all ${
                    activeTab === tab.key
                      ? "bg-primary/10 text-primary shadow-lg shadow-primary/10"
                      : "text-muted-foreground hover:bg-accent/30 hover:text-foreground"
                  }`}
                >
                  {tab.label}
                  {"count" in tab && tab.count > 0 && (
                    <span className="rounded-full border border-primary/20 bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary">
                      {tab.count}
                    </span>
                  )}
                </button>
              ))}
            </div>
          );
        })()}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden">
        {activeTab === "params" && (
          <ParamsEditor
            params={activeRequest.queryParams ?? []}
            onChange={updateQueryParams}
          />
        )}

        {activeTab === "headers" && (
          <HeadersEditor
            headers={activeRequest.headers}
            onUpdate={updateHeader}
            onAdd={addHeader}
            onRemove={removeHeader}
          />
        )}

        {activeTab === "auth" && (
          <AuthEditor auth={activeRequest.auth} onChange={updateAuth} />
        )}

        {activeTab === "body" && (
          <BodyEditor body={activeRequest.body} onChange={updateBody} />
        )}

        {error && <div className="mt-3 text-sm text-rose-300">{error}</div>}
      </div>
    </section>
  );
};
