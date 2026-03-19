import {
  CheckCheck,
  FolderTree,
  PanelsTopLeft,
  SquareTerminal,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Group, Panel, Separator } from "react-resizable-panels";
import { Toaster } from "sonner";
import { RequestEditor } from "./components/RequestEditor";
import { ResponsePane } from "./components/ResponsePane";
import { Sidebar } from "./components/Sidebar";
import { EnvironmentManager } from "./components/EnvironmentManager";
import { ThemeToggle } from "./components/ThemeToggle";
import { UpdateChecker } from "./components/UpdateChecker";
import { loadLocalData, saveLocalData } from "./services/ipc";
import { useThemeStore } from "./store/useThemeStore";
import { useWorkspaceStore } from "./store/useWorkspaceStore";
import { HttpResponse } from "./types";

function App() {
  const [response, setResponse] = useState<HttpResponse | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [mobileView, setMobileView] = useState<
    "workspace" | "editor" | "response"
  >("workspace");
  const [environmentManagerOpen, setEnvironmentManagerOpen] = useState(false);
  const applyTheme = useThemeStore((state) => state.applyTheme);
  const theme = useThemeStore((state) => state.theme);
  const [saved, setSaved] = useState(false);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const workspace = useWorkspaceStore((state) => state.workspace);
  const loadWorkspaceFromData = useWorkspaceStore(
    (state) => state.loadWorkspaceFromData,
  );
  const activeRequestId = useWorkspaceStore((state) => state.activeRequestId);

  useEffect(() => {
    applyTheme();
  }, [applyTheme]);

  // Load persisted workspace on startup
  useEffect(() => {
    const loadSaved = async (): Promise<void> => {
      try {
        const saved = await loadLocalData();
        if (saved) {
          loadWorkspaceFromData(saved);
        }
      } catch {
        // No saved workspace yet — start fresh
      }
    };
    void loadSaved();
  }, [loadWorkspaceFromData]);

  // Restore last response when switching tabs
  useEffect(() => {
    if (!activeRequestId) {
      setResponse(null);
      return;
    }
    const activeRequest = workspace.folders
      .flatMap((f) => f.requests)
      .find((r) => r.id === activeRequestId);
    setResponse(activeRequest?.lastResponse ?? null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeRequestId]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent): void => {
      const key = e.key.toLowerCase();
      const metaOrCtrl = e.ctrlKey || e.metaKey;
      const isUndo = metaOrCtrl && key === "z" && !e.shiftKey;
      const isRedo = metaOrCtrl && key === "z" && e.shiftKey;
      const target = e.target instanceof HTMLElement ? e.target : null;
      const isEditableTarget =
        target?.isContentEditable ||
        target?.tagName === "INPUT" ||
        target?.tagName === "TEXTAREA" ||
        target?.tagName === "SELECT";
      const allowWorkspaceUndo =
        !isEditableTarget ||
        Boolean(target?.closest('[data-undo-scope="workspace"]'));

      if ((isUndo || isRedo) && !allowWorkspaceUndo) {
        return;
      }

      if (isUndo) {
        e.preventDefault();
        const { undo, canUndo } = useWorkspaceStore.getState();
        if (canUndo()) {
          undo();
        }
        return;
      }

      if (isRedo) {
        e.preventDefault();
        const { redo, canRedo } = useWorkspaceStore.getState();
        if (canRedo()) {
          redo();
        }
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        void saveLocalData(workspace).then(() => {
          setSaved(true);
          if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
          saveTimerRef.current = setTimeout(() => setSaved(false), 2000);
        });
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [workspace]);

  const handleResponse = (nextResponse: HttpResponse): void => {
    setResponse(nextResponse);
    setMobileView("response");
  };

  return (
    <div className="relative h-[100dvh] w-full overflow-hidden bg-background text-foreground">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-[-7rem] top-[-6rem] h-72 w-72 rounded-full bg-primary/20 blur-3xl" />
        <div className="absolute right-[-4rem] top-10 h-64 w-64 rounded-full bg-cyan-400/10 blur-3xl" />
        <div className="absolute bottom-[-8rem] left-1/3 h-80 w-80 rounded-full bg-amber-300/10 blur-3xl" />
      </div>
      <Toaster richColors theme={theme} position="bottom-right" />
      <div className="relative flex h-full w-full">
        <div className="app-shell flex h-full w-full min-w-0 overflow-hidden bg-background">
          <div className="flex min-h-0 flex-1 flex-col lg:hidden">
            <div className="border-b border-border/70 px-2.5 py-2.5">
              <div className="flex items-center justify-between gap-2.5">
                <div className="flex min-w-0 items-center gap-2">
                  <img src="/icon.png" alt="Endpt" className="h-6 w-6" />
                  <p className="eyebrow">Endpt</p>
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    <span
                      className={`inline-flex items-center gap-1 rounded-full border border-emerald-600/20 bg-emerald-600/10 text-emerald-700 dark:border-emerald-400/20 dark:bg-emerald-400/10 dark:text-emerald-400 px-2 py-1 text-[12px] font-semibold transition-all duration-300 ${
                        saved ? "opacity-100" : "opacity-0"
                      }`}
                    >
                      <CheckCheck size={12} />
                      Saved
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <ThemeToggle />
                </div>
              </div>

              <div className="mt-2.5 grid grid-cols-3 gap-1.5">
                <button
                  type="button"
                  onClick={() => setMobileView("workspace")}
                  className={`inline-flex min-h-[3rem] flex-col items-center justify-center gap-1 rounded-xl border px-2 py-2 text-[11px] font-medium transition-all sm:flex-row sm:gap-2 sm:px-3 sm:text-xs ${
                    mobileView === "workspace"
                      ? "border-primary/30 bg-primary/10 text-primary shadow-lg shadow-primary/10"
                      : "border-border/70 bg-background/50 text-muted-foreground hover:bg-accent/30 hover:text-foreground"
                  }`}
                >
                  <FolderTree size={14} />
                  Collections
                </button>
                <button
                  type="button"
                  onClick={() => setMobileView("editor")}
                  className={`inline-flex min-h-[3rem] flex-col items-center justify-center gap-1 rounded-xl border px-2 py-2 text-[11px] font-medium transition-all sm:flex-row sm:gap-2 sm:px-3 sm:text-xs ${
                    mobileView === "editor"
                      ? "border-primary/30 bg-primary/10 text-primary shadow-lg shadow-primary/10"
                      : "border-border/70 bg-background/50 text-muted-foreground hover:bg-accent/30 hover:text-foreground"
                  }`}
                >
                  <SquareTerminal size={14} />
                  Editor
                </button>
                <button
                  type="button"
                  onClick={() => setMobileView("response")}
                  className={`inline-flex min-h-[3rem] flex-col items-center justify-center gap-1 rounded-xl border px-2 py-2 text-[11px] font-medium transition-all sm:flex-row sm:gap-2 sm:px-3 sm:text-xs ${
                    mobileView === "response"
                      ? "border-primary/30 bg-primary/10 text-primary shadow-lg shadow-primary/10"
                      : "border-border/70 bg-background/50 text-muted-foreground hover:bg-accent/30 hover:text-foreground"
                  }`}
                >
                  <PanelsTopLeft size={14} />
                  Response
                </button>
              </div>
            </div>

            <div className="min-h-0 min-w-0 flex-1 overflow-y-auto overflow-x-hidden">
              {mobileView === "workspace" && (
                <Sidebar
                  onRequestSelected={() => setMobileView("editor")}
                  onOpenEnvironmentManager={() => setEnvironmentManagerOpen(true)}
                />
              )}
              {mobileView === "editor" && (
                <RequestEditor
                  onResponse={handleResponse}
                  isSending={isSending}
                  setIsSending={setIsSending}
                />
              )}
              {mobileView === "response" && (
                <ResponsePane response={response} isSending={isSending} />
              )}
            </div>
          </div>

          <div className="hidden h-full w-full lg:flex">
            <Group orientation="horizontal" className="h-full w-full">
              <Panel
                id="sidebar"
                defaultSize={"22%"}
                minSize={"15%"}
                maxSize={"35%"}
              >
                <Sidebar
                  onRequestSelected={() => setMobileView("editor")}
                  onOpenEnvironmentManager={() => setEnvironmentManagerOpen(true)}
                />
              </Panel>
              <Separator
                className="bg-border transition-colors data-[separator]:hover:bg-primary/50 data-[separator]:active:bg-primary"
                style={{ width: 2 }}
              />
              <Panel id="main" defaultSize={"78%"} minSize={"40%"}>
                <Group orientation="vertical" className="h-full">
                  <Panel id="editor" defaultSize={"55%"} minSize={"25%"}>
                    <div className="flex h-full min-w-0 flex-1 flex-col overflow-hidden">
                      <div className="flex flex-wrap items-center justify-between gap-2.5 border-b border-border/70 px-3 py-2.5">
                        <div className="min-w-0">
                          <div className="mt-1 flex flex-wrap items-center gap-2">
                            <h2 className="text-base font-semibold tracking-tight text-foreground sm:text-lg">
                              Compose and inspect traffic
                            </h2>
                            <span
                              className={`inline-flex items-center gap-1 rounded-full border border-emerald-600/20 bg-emerald-600/10 text-emerald-700 dark:border-emerald-400/20 dark:bg-emerald-400/10 dark:text-emerald-400 px-2.5 py-1 text-[12.5px] font-semibold transition-all duration-300 ${
                                saved ? "opacity-100" : "opacity-0"
                              }`}
                            >
                              <CheckCheck size={13} />
                              Saved
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <UpdateChecker />
                          <ThemeToggle />
                        </div>
                      </div>
                      <RequestEditor
                        onResponse={handleResponse}
                        isSending={isSending}
                        setIsSending={setIsSending}
                      />
                    </div>
                  </Panel>
                  <Separator
                    className="bg-border transition-colors data-[separator]:hover:bg-primary/50 data-[separator]:active:bg-primary"
                    style={{ height: 2 }}
                  />
                  <Panel id="response" defaultSize={"45%"} minSize={"15%"}>
                    <ResponsePane response={response} isSending={isSending} />
                  </Panel>
                </Group>
              </Panel>
            </Group>
          </div>
        </div>
      </div>
      <EnvironmentManager
        open={environmentManagerOpen}
        onClose={() => setEnvironmentManagerOpen(false)}
      />
    </div>
  );
}

export default App;
