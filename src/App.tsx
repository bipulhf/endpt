import { useEffect, useState } from "react";
import { Group, Panel, Separator } from "react-resizable-panels";
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
      <Group orientation="horizontal" className="h-full w-full">
        <Panel defaultSize={24} minSize={16} maxSize={32}>
          <Sidebar />
        </Panel>
        <Separator className="w-1 bg-border/60 transition-colors hover:bg-primary/60" />
        <Panel>
          <Group orientation="vertical" className="h-full">
            <Panel minSize={40}>
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
            <Separator className="h-1 bg-border/60 transition-colors hover:bg-primary/60" />
            <Panel defaultSize={30} minSize={20}>
              <ResponsePane response={response} isSending={isSending} />
            </Panel>
          </Group>
        </Panel>
      </Group>
    </div>
  );
}

export default App;
