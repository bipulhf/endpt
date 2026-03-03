import { useEffect, useState } from "react";
import { Group, Panel, Separator } from "react-resizable-panels";
import { Toaster } from "sonner";
import { RequestEditor } from "./components/RequestEditor";
import { ResponsePane } from "./components/ResponsePane";
import { Sidebar } from "./components/Sidebar";
import { ThemeToggle } from "./components/ThemeToggle";
import { useThemeStore } from "./store/useThemeStore";
import { HttpResponse } from "./types";

function App() {
  const [response, setResponse] = useState<HttpResponse | null>(null);
  const [isSending, setIsSending] = useState(false);
  const applyTheme = useThemeStore((state) => state.applyTheme);

  useEffect(() => {
    applyTheme();
  }, [applyTheme]);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background text-foreground">
      <Toaster richColors position="bottom-right" />
      <Group orientation="horizontal" className="h-full w-full">
        <Panel id="sidebar" defaultSize={280} minSize={250} maxSize={450}>
          <Sidebar />
        </Panel>
        <Separator
          className="bg-border transition-colors hover:bg-primary/60 active:bg-primary data-[separator]:cursor-col-resize"
          style={{ width: 6 }}
        />
        <Panel id="main" defaultSize={75} minSize={40}>
          <Group orientation="vertical" className="h-full">
            <Panel id="editor" defaultSize={55} minSize={25}>
              <div className="flex h-full min-w-0 flex-1 flex-col overflow-hidden">
                <div className="flex items-center justify-end border-b border-border px-4 py-2">
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
              className="bg-border transition-colors hover:bg-primary/60 active:bg-primary data-[separator]:cursor-row-resize"
              style={{ height: 6 }}
            />
            <Panel id="response" defaultSize={250} minSize={200}>
              <ResponsePane response={response} isSending={isSending} />
            </Panel>
          </Group>
        </Panel>
      </Group>
    </div>
  );
}

export default App;
