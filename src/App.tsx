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
      <Group
        orientation="horizontal"
        className="h-full w-full"
        defaultLayout={{ sidebar: 22, main: 78 }}
      >
        <Panel id="sidebar" defaultSize={22} minSize={16} maxSize={40}>
          <Sidebar />
        </Panel>
        <Separator className="w-1.5 cursor-col-resize bg-border/60 transition-colors hover:bg-primary/60 active:bg-primary" />
        <Panel id="main">
          <Group
            orientation="vertical"
            className="h-full"
            defaultLayout={{ editor: 60, response: 40 }}
          >
            <Panel id="editor" defaultSize={60} minSize={30}>
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
            <Separator className="h-1.5 cursor-row-resize bg-border/60 transition-colors hover:bg-primary/60 active:bg-primary" />
            <Panel id="response" defaultSize={40} minSize={20}>
              <ResponsePane response={response} isSending={isSending} />
            </Panel>
          </Group>
        </Panel>
      </Group>
    </div>
  );
}

export default App;
