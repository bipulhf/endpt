import { Download, FolderPlus, ChevronDown, ChevronRight, FilePlus, Trash2, Pencil, Upload } from "lucide-react";
import { exportData, importData } from "../services/ipc";
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
  const [error, setError] = useState("");

  const handleCreateFolder = (): void => {
    if (!newFolderName.trim()) {
      return;
    }
    createFolder(newFolderName);
    setNewFolderName("");
  };

  const handleExport = async (): Promise<void> => {
    try {
      await exportData(workspace);
      setError("");
    } catch (exportError) {
      const message = exportError instanceof Error ? exportError.message : "Export failed";
      setError(message);
    }
  };

  const handleImport = async (): Promise<void> => {
    try {
      const data = await importData();
      if (data) {
        loadWorkspaceFromData(data);
      }
      setError("");
    } catch (importError) {
      const message = importError instanceof Error ? importError.message : "Import failed";
      setError(message);
    }
  };

  const handleRenameFolder = (folderId: string, currentName: string): void => {
    const nextName = window.prompt("Rename folder", currentName);
    if (nextName && nextName.trim()) {
      renameFolder(folderId, nextName);
    }
  };

  return (
    <aside className="flex h-full w-72 flex-col border-r border-gray-800 bg-gray-900">
      <div className="border-b border-gray-800 p-4">
        <h1 className="text-lg font-semibold text-gray-100">postman-lite</h1>
        <div className="mt-3 flex gap-2">
          <button
            type="button"
            onClick={handleImport}
            className="inline-flex items-center gap-1 rounded bg-gray-800 px-2 py-1 text-xs text-gray-200 hover:bg-gray-700"
          >
            <Upload size={14} />
            Import
          </button>
          <button
            type="button"
            onClick={handleExport}
            className="inline-flex items-center gap-1 rounded bg-gray-800 px-2 py-1 text-xs text-gray-200 hover:bg-gray-700"
          >
            <Download size={14} />
            Export
          </button>
        </div>
      </div>

      <div className="border-b border-gray-800 p-3">
        <div className="flex gap-2">
          <input
            value={newFolderName}
            onChange={(event) => setNewFolderName(event.target.value)}
            placeholder="Folder name"
            className="w-full rounded border border-gray-700 bg-gray-800 px-2 py-1 text-sm text-gray-100 outline-none focus:border-indigo-500"
          />
          <button
            type="button"
            onClick={handleCreateFolder}
            className="inline-flex items-center justify-center rounded bg-indigo-600 px-2 py-1 text-white hover:bg-indigo-500"
            aria-label="New folder"
          >
            <FolderPlus size={16} />
          </button>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-2">
        {workspace.folders.map((folder) => (
          <div key={folder.id} className="mb-2 rounded border border-gray-800 bg-gray-950/40">
            <div className="flex items-center gap-1 p-2">
              <button
                type="button"
                onClick={() => toggleFolderCollapse(folder.id)}
                className="rounded p-1 text-gray-300 hover:bg-gray-800"
                aria-label="Toggle folder"
              >
                {folder.collapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
              </button>
              <span className="flex-1 truncate text-sm text-gray-100">{folder.name}</span>
              <button
                type="button"
                onClick={() => createRequest(folder.id, "New Request")}
                className="rounded p-1 text-gray-300 hover:bg-gray-800"
                aria-label="New request"
              >
                <FilePlus size={14} />
              </button>
              <button
                type="button"
                onClick={() => handleRenameFolder(folder.id, folder.name)}
                className="rounded p-1 text-gray-300 hover:bg-gray-800"
                aria-label="Rename folder"
              >
                <Pencil size={14} />
              </button>
              <button
                type="button"
                onClick={() => deleteFolder(folder.id)}
                className="rounded p-1 text-red-300 hover:bg-gray-800"
                aria-label="Delete folder"
              >
                <Trash2 size={14} />
              </button>
            </div>

            {!folder.collapsed && (
              <div className="space-y-1 px-2 pb-2">
                {folder.requests.map((request) => (
                  <div
                    key={request.id}
                    className={`flex items-center gap-2 rounded px-2 py-1 ${activeRequestId === request.id ? "bg-indigo-600/20" : "hover:bg-gray-800"
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
                      <span className="truncate text-xs text-gray-200">{request.name}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteRequest(folder.id, request.id)}
                      className="rounded p-1 text-red-300 hover:bg-gray-700"
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

      {error && <div className="border-t border-gray-800 p-2 text-xs text-red-300">{error}</div>}
    </aside>
  );
};
