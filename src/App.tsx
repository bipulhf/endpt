import { useState } from "react";
import { RequestEditor } from "./components/RequestEditor";
import { ResponsePane } from "./components/ResponsePane";
import { Sidebar } from "./components/Sidebar";
import { HttpResponse } from "./types";

function App() {
  const [response, setResponse] = useState<HttpResponse | null>(null);
  const [isSending, setIsSending] = useState(false);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-gray-950 text-gray-100">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <RequestEditor
          onResponse={setResponse}
          isSending={isSending}
          setIsSending={setIsSending}
        />
        <ResponsePane response={response} isSending={isSending} />
      </div>
    </div>
  );
}

export default App;
