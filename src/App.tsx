import { useCallback, useEffect, useRef, useState } from "react";
import { Group, Panel, Separator } from "react-resizable-panels";
import { Toaster, toast } from "sonner";
import { AppTopbar } from "./components/AppTopbar";
import { EnvironmentManager } from "./components/EnvironmentManager";
import { RequestEditor } from "./components/RequestEditor";
import { ResponsePane } from "./components/ResponsePane";
import { Sidebar } from "./components/Sidebar";
import {
  listenStreamEvents,
  loadLocalData,
  saveLocalData,
} from "./services/ipc";
import { useRealtimeStore } from "./store/useRealtimeStore";
import { useThemeStore } from "./store/useThemeStore";
import { useWorkspaceStore } from "./store/useWorkspaceStore";

function App() {
  const [isBusy, setIsBusy] = useState(false);
  const [mobileView, setMobileView] = useState<
    "workspace" | "editor" | "response"
  >("workspace");
  const [environmentManagerOpen, setEnvironmentManagerOpen] = useState(false);
  const [saved, setSaved] = useState(false);

  const applyTheme = useThemeStore((state) => state.applyTheme);
  const theme = useThemeStore((state) => state.theme);
  const loadWorkspaceFromData = useWorkspaceStore(
    (state) => state.loadWorkspaceFromData,
  );
  const appendEvent = useRealtimeStore((state) => state.appendEvent);
  const setSessionState = useRealtimeStore((state) => state.setSessionState);

  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const saveWorkspace = useCallback(async (): Promise<void> => {
    try {
      await saveLocalData(useWorkspaceStore.getState().workspace);
      setSaved(true);
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }
      saveTimerRef.current = setTimeout(() => setSaved(false), 1800);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Save failed";
      toast.error(message);
    }
  }, []);

  useEffect(() => {
    applyTheme();
  }, [applyTheme]);

  useEffect(
    () => () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }
    },
    [],
  );

  useEffect(() => {
    const loadSaved = async (): Promise<void> => {
      try {
        const savedWorkspace = await loadLocalData();
        if (savedWorkspace) {
          loadWorkspaceFromData(savedWorkspace);
        }
      } catch {
        // Ignore if no local data exists yet.
      }
    };

    void loadSaved();
  }, [loadWorkspaceFromData]);

  useEffect(() => {
    let unsubscribed = false;
    let unlisten: (() => void) | null = null;

    const bindEvents = async (): Promise<void> => {
      try {
        const off = await listenStreamEvents((event) => {
          appendEvent(event);

          if (event.direction === "error") {
            setSessionState(event.request_id, {
              protocol: event.protocol,
              status: "error",
              sessionId: event.session_id,
              error: event.payload,
            });
            return;
          }

          if (event.direction === "status") {
            const statusText = (event.payload || "").toLowerCase();
            const mappedStatus = statusText.includes("connecting")
              ? "connecting"
              : statusText.includes("disconnect") || statusText.includes("closed")
                ? "disconnected"
                : statusText.includes("connected") || statusText.includes("open")
                  ? "connected"
                  : undefined;

            if (mappedStatus) {
              setSessionState(event.request_id, {
                protocol: event.protocol,
                status: mappedStatus,
                sessionId:
                  mappedStatus === "disconnected" ? null : event.session_id,
                error: null,
              });
            }
          }
        });

        if (unsubscribed) {
          off();
          return;
        }

        unlisten = off;
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Failed to subscribe to stream events";
        toast.error(message);
      }
    };

    void bindEvents();

    return () => {
      unsubscribed = true;
      if (unlisten) {
        unlisten();
      }
    };
  }, [appendEvent, setSessionState]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent): void => {
      const key = event.key.toLowerCase();
      const metaOrCtrl = event.ctrlKey || event.metaKey;
      const isUndo = metaOrCtrl && key === "z" && !event.shiftKey;
      const isRedo = metaOrCtrl && key === "z" && event.shiftKey;

      const target = event.target instanceof HTMLElement ? event.target : null;
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
        event.preventDefault();
        const { undo, canUndo } = useWorkspaceStore.getState();
        if (canUndo()) {
          undo();
        }
        return;
      }

      if (isRedo) {
        event.preventDefault();
        const { redo, canRedo } = useWorkspaceStore.getState();
        if (canRedo()) {
          redo();
        }
        return;
      }

      if (metaOrCtrl && key === "s") {
        event.preventDefault();
        void saveWorkspace();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [saveWorkspace]);

  return (
    <div className="relative h-[100dvh] w-full overflow-hidden bg-background text-foreground">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-[-7rem] top-[-6rem] h-72 w-72 rounded-full bg-primary/20 blur-3xl" />
        <div className="absolute right-[-4rem] top-10 h-64 w-64 rounded-full bg-cyan-400/10 blur-3xl" />
        <div className="absolute bottom-[-8rem] left-1/3 h-80 w-80 rounded-full bg-amber-300/10 blur-3xl" />
      </div>

      <Toaster richColors theme={theme} position="bottom-right" />

      <div className="relative flex h-full w-full p-1.5 sm:p-2.5">
        <div className="app-shell flex h-full w-full min-w-0 flex-col overflow-hidden bg-background">
          <AppTopbar
            mobileView={mobileView}
            onChangeMobileView={setMobileView}
            onOpenEnvironmentManager={() => setEnvironmentManagerOpen(true)}
            onSave={() => {
              void saveWorkspace();
            }}
            saved={saved}
          />

          <div className="min-h-0 min-w-0 flex-1 overflow-hidden">
            <div className="flex h-full min-h-0 flex-1 flex-col lg:hidden">
              <div className="min-h-0 min-w-0 flex-1 overflow-y-auto overflow-x-hidden">
                {mobileView === "workspace" && (
                  <Sidebar onRequestSelected={() => setMobileView("editor")} />
                )}
                {mobileView === "editor" && (
                  <RequestEditor
                    isBusy={isBusy}
                    setIsBusy={setIsBusy}
                  />
                )}
                {mobileView === "response" && (
                  <ResponsePane isBusy={isBusy} />
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
                  <Sidebar onRequestSelected={() => setMobileView("editor")} />
                </Panel>

                <Separator
                  className="bg-border transition-colors data-[separator]:hover:bg-primary/50 data-[separator]:active:bg-primary"
                  style={{ width: 2 }}
                />

                <Panel id="main" defaultSize={"78%"} minSize={"40%"}>
                  <Group orientation="vertical" className="h-full">
                    <Panel id="editor" defaultSize={"55%"} minSize={"25%"}>
                      <RequestEditor
                        isBusy={isBusy}
                        setIsBusy={setIsBusy}
                      />
                    </Panel>

                    <Separator
                      className="bg-border transition-colors data-[separator]:hover:bg-primary/50 data-[separator]:active:bg-primary"
                      style={{ height: 2 }}
                    />

                    <Panel id="response" defaultSize={"45%"} minSize={"15%"}>
                      <ResponsePane isBusy={isBusy} />
                    </Panel>
                  </Group>
                </Panel>
              </Group>
            </div>
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
