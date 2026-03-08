import {
  ChevronDown,
  ChevronRight,
  Download,
  FilePlus,
  FolderPlus,
  Save,
  Trash2,
  Upload,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { exportData, importData, saveLocalData } from "../services/ipc";
import { useWorkspaceStore } from "../store/useWorkspaceStore";
import { HttpMethod } from "../types";
import { ReactElement, useState } from "react";

interface SidebarProps {
  onRequestSelected?: () => void;
}

const methodClasses: Record<HttpMethod, string> = {
  GET: "border-emerald-600/20 bg-emerald-600/10 text-emerald-700 dark:border-emerald-400/20 dark:bg-emerald-400/10 dark:text-emerald-400",
  POST: "border-sky-600/20 bg-sky-600/10 text-sky-700 dark:border-sky-400/20 dark:bg-sky-400/10 dark:text-sky-400",
  PUT: "border-amber-600/20 bg-amber-600/10 text-amber-700 dark:border-amber-400/20 dark:bg-amber-400/10 dark:text-amber-400",
  PATCH:
    "border-fuchsia-600/20 bg-fuchsia-600/10 text-fuchsia-700 dark:border-fuchsia-400/20 dark:bg-fuchsia-400/10 dark:text-fuchsia-400",
  DELETE:
    "border-rose-600/20 bg-rose-600/10 text-rose-700 dark:border-rose-400/20 dark:bg-rose-400/10 dark:text-rose-400",
  HEAD: "border-slate-600/20 bg-slate-600/10 text-slate-700 dark:border-slate-400/20 dark:bg-slate-400/10 dark:text-slate-400",
  OPTIONS:
    "border-slate-600/20 bg-slate-600/10 text-slate-700 dark:border-slate-400/20 dark:bg-slate-400/10 dark:text-slate-400",
};

export const Sidebar = ({ onRequestSelected }: SidebarProps): ReactElement => {
  const workspace = useWorkspaceStore((state) => state.workspace);
  const activeRequestId = useWorkspaceStore((state) => state.activeRequestId);
  const createFolder = useWorkspaceStore((state) => state.createFolder);
  const createRequest = useWorkspaceStore((state) => state.createRequest);
  const deleteFolder = useWorkspaceStore((state) => state.deleteFolder);
  const renameFolder = useWorkspaceStore((state) => state.renameFolder);
  const toggleFolderCollapse = useWorkspaceStore(
    (state) => state.toggleFolderCollapse,
  );
  const deleteRequest = useWorkspaceStore((state) => state.deleteRequest);
  const updateRequest = useWorkspaceStore((state) => state.updateRequest);
  const setActiveRequest = useWorkspaceStore((state) => state.setActiveRequest);
  const loadWorkspaceFromData = useWorkspaceStore(
    (state) => state.loadWorkspaceFromData,
  );
  const [newFolderName, setNewFolderName] = useState("");
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [editingItem, setEditingItem] = useState<
    | { kind: "folder"; id: string; value: string }
    | { kind: "request"; id: string; folderId: string; value: string }
    | null
  >(null);

  const handleCreateFolder = (): void => {
    if (!newFolderName.trim()) {
      return;
    }
    createFolder(newFolderName);
    setNewFolderName("");
  };

  const handleCreateRequest = (folderId: string): void => {
    createRequest(folderId, "New Request");
    onRequestSelected?.();
  };

  const handleSelectRequest = (requestId: string): void => {
    setActiveRequest(requestId);
    onRequestSelected?.();
  };

  const persistWorkspace = (): void => {
    void saveLocalData(useWorkspaceStore.getState().workspace);
  };

  const startFolderRename = (folderId: string, name: string): void => {
    setEditingItem({ kind: "folder", id: folderId, value: name });
  };

  const startRequestRename = (
    folderId: string,
    requestId: string,
    name: string,
  ): void => {
    setEditingItem({ kind: "request", id: requestId, folderId, value: name });
  };

  const cancelRename = (): void => {
    setEditingItem(null);
  };

  const commitRename = (): void => {
    if (!editingItem) {
      return;
    }

    const trimmedName = editingItem.value.trim();
    if (!trimmedName) {
      setEditingItem(null);
      return;
    }

    if (editingItem.kind === "folder") {
      renameFolder(editingItem.id, trimmedName);
    } else {
      updateRequest(editingItem.id, { name: trimmedName });
    }

    persistWorkspace();
    setEditingItem(null);
  };

  const handleSave = async (): Promise<void> => {
    try {
      await saveLocalData(workspace);
      toast.success("Workspace saved");
    } catch (saveError) {
      const message =
        saveError instanceof Error ? saveError.message : "Save failed";
      toast.error(message);
    }
  };

  const handleExport = async (): Promise<void> => {
    try {
      await exportData(workspace);
      setError("");
      toast.success("Workspace exported");
    } catch (exportError) {
      const message =
        exportError instanceof Error ? exportError.message : "Export failed";
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
      const message =
        importError instanceof Error ? importError.message : "Import failed";
      setError(message);
      toast.error(message);
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
        [request.name, request.url, request.method]
          .join(" ")
          .toLowerCase()
          .includes(normalizedSearch),
      );

      return { folder, requests };
    })
    .filter(
      ({ folder, requests }) =>
        !normalizedSearch ||
        requests.length > 0 ||
        folder.name.toLowerCase().includes(normalizedSearch),
    );

  return (
    <aside className="flex h-full w-full min-w-0 flex-col overflow-hidden bg-gradient-to-b from-card/95 via-card/80 to-background/75">
      <div className="border-b border-border/70 p-1.5 sm:p-3 lg:p-4">
        <div className="panel-surface rounded-[1rem] p-1.5 sm:rounded-[1.15rem] sm:p-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="eyebrow">Workspace</p>
              <h1 className="mt-1 text-lg font-semibold tracking-tight text-foreground sm:text-xl">
                Endpt
              </h1>
            </div>
          </div>

          <div className="mt-3 flex flex-wrap gap-1.5">
            <Button
              size="sm"
              onClick={() => {
                void handleSave();
              }}
              className="flex-1 min-w-[5.5rem]"
            >
              <Save size={14} />
              Save
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                void handleImport();
              }}
              className="flex-1 min-w-[5.5rem]"
            >
              <Upload size={14} />
              Import
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                void handleExport();
              }}
              className="flex-1 min-w-[5.5rem]"
            >
              <Download size={14} />
              Export
            </Button>
          </div>
        </div>
      </div>

      <div className="border-b border-border/70 p-1.5 sm:p-3">
        <div className="panel-subtle rounded-[1rem] p-1.5 sm:rounded-[1.1rem]">
          <p className="eyebrow mb-1.5">Organize</p>
          <div className="mb-1.5">
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search requests, URLs, methods..."
              className="h-9"
            />
          </div>
          <div className="flex gap-1.5">
            <Input
              value={newFolderName}
              onChange={(event) => setNewFolderName(event.target.value)}
              placeholder="New folder"
              className="h-9"
            />
            <Button
              size="icon"
              onClick={handleCreateFolder}
              aria-label="New folder"
              disabled={!newFolderName.trim()}
            >
              <FolderPlus size={16} />
            </Button>
          </div>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-1.5 sm:p-3">
        <div className="mb-2 flex items-center justify-between">
          <p className="eyebrow">Collections</p>
          <span className="rounded-full border border-border/60 bg-background/50 px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
            {filteredFolders.length} shown
          </span>
        </div>

        <div className="space-y-2">
          {filteredFolders.map(({ folder, requests }) => (
            <div
              key={folder.id}
              className="panel-subtle rounded-[0.95rem] p-1.5 sm:rounded-[1rem] sm:p-2"
            >
              <div className="flex items-center gap-1.5 p-0.5">
                <button
                  type="button"
                  onClick={() => toggleFolderCollapse(folder.id)}
                  className="inline-flex min-h-[2.5rem] min-w-[2.5rem] items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-accent/50 hover:text-foreground"
                  aria-label="Toggle folder"
                >
                  {folder.collapsed ? (
                    <ChevronRight size={16} />
                  ) : (
                    <ChevronDown size={16} />
                  )}
                </button>
                <div
                  className="min-w-0 flex-1"
                  onDoubleClick={() =>
                    startFolderRename(folder.id, folder.name)
                  }
                  title="Double-click to rename"
                >
                  {editingItem?.kind === "folder" &&
                  editingItem.id === folder.id ? (
                    <input
                      autoFocus
                      value={editingItem.value}
                      onChange={(event) =>
                        setEditingItem((current) =>
                          current?.kind === "folder" && current.id === folder.id
                            ? { ...current, value: event.target.value }
                            : current,
                        )
                      }
                      onBlur={commitRename}
                      onClick={(event) => event.stopPropagation()}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          event.preventDefault();
                          commitRename();
                        }
                        if (event.key === "Escape") {
                          event.preventDefault();
                          cancelRename();
                        }
                      }}
                      className="control-field h-8 w-full rounded-lg px-2.5 py-1.5 text-sm font-semibold text-foreground"
                    />
                  ) : (
                    <div className="truncate text-sm font-semibold text-foreground">
                      {folder.name}
                    </div>
                  )}
                  <div className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                    {folder.requests.length} requests
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleCreateRequest(folder.id)}
                  className="inline-flex min-h-[2.5rem] min-w-[2.5rem] items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-accent/50 hover:text-foreground"
                  aria-label="New request"
                >
                  <FilePlus size={15} />
                </button>
                <button
                  type="button"
                  onClick={() => deleteFolder(folder.id)}
                  className="inline-flex min-h-[2.5rem] min-w-[2.5rem] items-center justify-center rounded-xl text-rose-400 transition-colors hover:bg-rose-500/10 hover:text-rose-300"
                  aria-label="Delete folder"
                >
                  <Trash2 size={15} />
                </button>
              </div>

              {!folder.collapsed && (
                <div className="mt-1.5 space-y-1.5">
                  {requests.map((request) => (
                    <div
                      key={request.id}
                      className={`group flex items-center gap-1.5 rounded-xl border px-2.5 py-1 transition-all ${
                        activeRequestId === request.id
                          ? "border-primary/30 bg-primary/10 shadow-lg shadow-primary/10"
                          : "border-border/60 bg-background/40 hover:border-primary/20 hover:bg-accent/30"
                      }`}
                    >
                      <div className="flex min-w-0 flex-1 items-center gap-1.5">
                        <span
                          className={`inline-flex rounded-full border px-2 py-1 text-[10px] font-semibold ${methodClasses[request.method]}`}
                        >
                          {request.method}
                        </span>
                        {editingItem?.kind === "request" &&
                        editingItem.id === request.id ? (
                          <div className="min-w-0 flex-1">
                            <input
                              autoFocus
                              value={editingItem.value}
                              onChange={(event) =>
                                setEditingItem((current) =>
                                  current?.kind === "request" &&
                                  current.id === request.id
                                    ? { ...current, value: event.target.value }
                                    : current,
                                )
                              }
                              onBlur={commitRename}
                              onKeyDown={(event) => {
                                if (event.key === "Enter") {
                                  event.preventDefault();
                                  commitRename();
                                }
                                if (event.key === "Escape") {
                                  event.preventDefault();
                                  cancelRename();
                                }
                              }}
                              className="control-field h-8 w-full rounded-lg px-2.5 py-1.5 text-sm font-medium text-foreground"
                            />
                            <div className="mt-1 truncate text-xs text-muted-foreground">
                              {request.url || "No URL yet"}
                            </div>
                          </div>
                        ) : (
                          <button
                            type="button"
                            className="min-w-0 flex-1 text-left"
                            onClick={() => handleSelectRequest(request.id)}
                          >
                            <div
                              className="min-w-0"
                              onDoubleClick={(event) => {
                                event.stopPropagation();
                                startRequestRename(
                                  folder.id,
                                  request.id,
                                  request.name,
                                );
                              }}
                              title="Double-click to rename"
                            >
                              <div className="truncate text-sm font-medium text-foreground">
                                {request.name}
                              </div>
                              <div className="truncate text-xs text-muted-foreground">
                                {request.url || "No URL yet"}
                              </div>
                            </div>
                          </button>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => deleteRequest(folder.id, request.id)}
                        className="inline-flex min-h-[2.25rem] min-w-[2.25rem] items-center justify-center rounded-xl text-rose-400 transition-colors hover:bg-rose-500/10 hover:text-rose-300"
                        aria-label="Delete request"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  ))}

                  {requests.length === 0 && (
                    <div className="rounded-2xl border border-dashed border-border/70 px-3 py-5 text-center text-xs text-muted-foreground">
                      This folder is empty. Add a request to start composing.
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}

          {filteredFolders.length === 0 && (
            <div className="panel-subtle rounded-[1.2rem] px-4 py-10 text-center">
              <p className="text-sm font-medium text-foreground">
                No matching folders
              </p>
              <p className="mt-2 text-xs leading-6 text-muted-foreground">
                Try a different search term or create a fresh collection.
              </p>
            </div>
          )}
        </div>
      </div>

      {error && (
        <div className="border-t border-border/70 px-4 py-3 text-xs text-rose-300">
          {error}
        </div>
      )}
    </aside>
  );
};
