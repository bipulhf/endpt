import { Download, FolderPlus, ChevronDown, ChevronRight, FilePlus, Save, Trash2, Pencil, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { exportData, importData, saveLocalData } from "../services/ipc";
import { useWorkspaceStore } from "../store/useWorkspaceStore";
import { HttpMethod } from "../types";
import { ReactElement, useState } from "react";

const methodClasses: Record<HttpMethod, string> = {
  GET: "bg-green-900 text-green-400",
  POST: "bg-blue-900 text-blue-400",
  PUT: "bg-amber-900 text-amber-400",
  PATCH: "bg-purple-900 text-purple-400",
  DELETE: "bg-red-900 text-red-400",
  HEAD: "bg-gray-700 text-gray-300",
  OPTIONS: "bg-gray-700 text-gray-300",
};

export const Sidebar = (): ReactElement => {
  const workspace = useWorkspaceStore((state) => state.workspace);
  const activeRequestId = useWorkspaceStore((state) => state.activeRequestId);
  const createFolder = useWorkspaceStore((state) => state.createFolder);
  const createRequest = useWorkspaceStore((state) => state.createRequest);
  const deleteFolder = useWorkspaceStore((state) => state.deleteFolder);
  const renameFolder = useWorkspaceStore((state) => state.renameFolder);
  const toggleFolderCollapse = useWorkspaceStore((state) => state.toggleFolderCollapse);
  const deleteRequest = useWorkspaceStore((state) => state.deleteRequest);
  const setActiveRequest = useWorkspaceStore((state) => state.setActiveRequest);
  const loadWorkspaceFromData = useWorkspaceStore((state) => state.loadWorkspaceFromData);
  const [newFolderName, setNewFolderName] = useState("");
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");

  const handleCreateFolder = (): void => {
    if (!newFolderName.trim()) {
      return;
    }
    createFolder(newFolderName);
    setNewFolderName("");
  };

  const handleSave = async (): Promise<void> => {
    try {
      await saveLocalData(workspace);
      toast.success("Workspace saved");
    } catch (saveError) {
      const message = saveError instanceof Error ? saveError.message : "Save failed";
      toast.error(message);
    }
  };

  const handleExport = async (): Promise<void> => {
    try {
      await exportData(workspace);
      setError("");
      toast.success("Workspace exported");
    } catch (exportError) {
      const message = exportError instanceof Error ? exportError.message : "Export failed";
      setError(message);
      toast.error(message);
    }
  };

  const handleImport = async (): Promise<void> => {
    try {
      const data = await importData();
      if (data) {
        loadWorkspaceFromData(data);
        toast.success("Workspace imported");
      }
      setError("");
    } catch (importError) {
      const message = importError instanceof Error ? importError.message : "Import failed";
      setError(message);
      toast.error(message);
    }
  };

  const handleRenameFolder = (folderId: string, currentName: string): void => {
    const nextName = window.prompt("Rename folder", currentName);
    if (nextName && nextName.trim()) {
      renameFolder(folderId, nextName);
    }
  };

  const normalizedSearch = search.trim().toLowerCase();

  const filteredFolders = workspace.folders
    .map((folder) => {
      if (!normalizedSearch) {
        return { folder, requests: folder.requests };
      }

      const folderMatch = folder.name.toLowerCase().includes(normalizedSearch);
      if (folderMatch) {
        return { folder, requests: folder.requests };
      }

      const requests = folder.requests.filter((request) =>
        [request.name, request.url, request.method].join(" ").toLowerCase().includes(normalizedSearch),
      );

      return { folder, requests };
    })
    .filter(({ folder, requests }) => !normalizedSearch || requests.length > 0 || folder.name.toLowerCase().includes(normalizedSearch));

  return (
    <aside className="flex h-full w-full flex-col border-r border-border bg-card">
      <div className="border-b border-border p-4">
        <h1 className="text-lg font-semibold text-foreground">Endpt</h1>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button
            size="sm"
            onClick={() => { void handleSave(); }}
          >
            <Save size={14} />
            Save
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => { void handleImport(); }}
          >
            <Upload size={14} />
            Import
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => { void handleExport(); }}
          >
            <Download size={14} />
            Export
          </Button>
        </div>
      </div>

      <div className="border-b border-border p-3">
        <div className="mb-2">
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search requests..."
            className="h-8 px-2"
          />
        </div>
        <div className="flex gap-2">
          <Input
            value={newFolderName}
            onChange={(event) => setNewFolderName(event.target.value)}
            placeholder="Folder name"
            className="h-8 px-2"
          />
          <Button
            size="icon"
            onClick={handleCreateFolder}
            aria-label="New folder"
          >
            <FolderPlus size={16} />
          </Button>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-2">
        {filteredFolders.map(({ folder, requests }) => (
          <div key={folder.id} className="mb-2 rounded border border-border bg-background/40">
            <div className="flex items-center gap-1 p-2">
              <button
                type="button"
                onClick={() => toggleFolderCollapse(folder.id)}
                className="rounded p-1 text-muted-foreground hover:bg-muted"
                aria-label="Toggle folder"
              >
                {folder.collapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
              </button>
              <span className="flex-1 truncate text-sm text-foreground">{folder.name}</span>
              <button
                type="button"
                onClick={() => createRequest(folder.id, "New Request")}
                className="rounded p-1 text-muted-foreground hover:bg-muted"
                aria-label="New request"
              >
                <FilePlus size={14} />
              </button>
              <button
                type="button"
                onClick={() => handleRenameFolder(folder.id, folder.name)}
                className="rounded p-1 text-muted-foreground hover:bg-muted"
                aria-label="Rename folder"
              >
                <Pencil size={14} />
              </button>
              <button
                type="button"
                onClick={() => deleteFolder(folder.id)}
                className="rounded p-1 text-red-500 hover:bg-muted"
                aria-label="Delete folder"
              >
                <Trash2 size={14} />
              </button>
            </div>

            {!folder.collapsed && (
              <div className="space-y-1 px-2 pb-2">
                {requests.map((request) => (
                  <div
                    key={request.id}
                    className={`flex items-center gap-2 rounded px-2 py-1 ${activeRequestId === request.id ? "bg-primary/15" : "hover:bg-muted"
                      }`}
                  >
                    <button
                      type="button"
                      className="flex min-w-0 flex-1 items-center gap-2 text-left"
                      onClick={() => setActiveRequest(request.id)}
                    >
                      <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${methodClasses[request.method]}`}>
                        {request.method}
                      </span>
                      <span className="truncate text-xs text-foreground">{request.name}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteRequest(folder.id, request.id)}
                      className="rounded p-1 text-red-500 hover:bg-muted"
                      aria-label="Delete request"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {error && <div className="border-t border-border p-2 text-xs text-red-500">{error}</div>}
    </aside>
  );
};
