import { CheckCheck } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Group, Panel, Separator } from "react-resizable-panels";
import { Toaster } from "sonner";
import { RequestEditor } from "./components/RequestEditor";
import { ResponsePane } from "./components/ResponsePane";
import { Sidebar } from "./components/Sidebar";
import { ThemeToggle } from "./components/ThemeToggle";
import { UpdateChecker } from "./components/UpdateChecker";
import { loadLocalData, saveLocalData } from "./services/ipc";
import { useThemeStore } from "./store/useThemeStore";
import { useWorkspaceStore } from "./store/useWorkspaceStore";
import { HttpResponse } from "./types";

function App() {
  const [response, setResponse] = useState<HttpResponse | null>(null);
  const [isSending, setIsSending] = useState(false);
  const applyTheme = useThemeStore((state) => state.applyTheme);
  const theme = useThemeStore((state) => state.theme);
  const [saved, setSaved] = useState(false);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const workspace = useWorkspaceStore((state) => state.workspace);
  const loadWorkspaceFromData = useWorkspaceStore((state) => state.loadWorkspaceFromData);
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

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background text-foreground">
      <Toaster richColors theme={theme} position="bottom-right" />
      <Group orientation="horizontal" className="h-full w-full">
        <Panel id="sidebar" defaultSize="22%" minSize="15%" maxSize="35%">
          <Sidebar />
        </Panel>
        <Separator
          className="bg-border transition-colors data-[separator]:hover:bg-primary/60 data-[separator]:active:bg-primary"
          style={{ width: 6 }}
        />
        <Panel id="main" defaultSize="78%" minSize="40%">
          <Group orientation="vertical" className="h-full">
            <Panel id="editor" defaultSize="55%" minSize="25%">
              <div className="flex h-full min-w-0 flex-1 flex-col overflow-hidden">
                <div className="flex items-center justify-end gap-3 border-b border-border px-4 py-2">
                  <span
                    className={`flex items-center gap-1 text-xs text-green-500 transition-all duration-300 ${saved ? "opacity-100" : "opacity-0"
                      }`}
                  >
                    <CheckCheck size={13} />
                    Saved
                  </span>
                  <UpdateChecker />
                  <ThemeToggle />
                </div>
                <RequestEditor
                  onResponse={setResponse}
                  isSending={isSending}
                  setIsSending={setIsSending}
                />
              </div>
            </Panel>
            <Separator
              className="bg-border transition-colors data-[separator]:hover:bg-primary/60 data-[separator]:active:bg-primary"
              style={{ height: 6 }}
            />
            <Panel id="response" defaultSize="45%" minSize="15%">
              <ResponsePane response={response} isSending={isSending} />
            </Panel>
          </Group>
        </Panel>
      </Group>
    </div>
  );
}

export default App;
