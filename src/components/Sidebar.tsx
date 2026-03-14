import {
  Download,
  FolderPlus,
  Save,
  Upload,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { FolderItem, EditingItem } from "./FolderItem";
import { exportData, importData, saveLocalData } from "../services/ipc";
import { useWorkspaceStore } from "../store/useWorkspaceStore";
import { ReactElement, useState } from "react";

interface SidebarProps {
  onRequestSelected?: () => void;
}

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
  const [editingItem, setEditingItem] = useState<EditingItem | null>(null);

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
      <div className="border-b border-border/70 p-1.5 sm:p-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <img src="/icon.png" alt="Endpt" className="h-7 w-7 sm:h-8 sm:w-8" />
            <h1 className="text-lg font-semibold tracking-tight text-foreground sm:text-xl">
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

      <div className="border-b border-border/70 p-1.5 sm:p-3">
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

      <div className="min-h-0 flex-1 overflow-y-auto p-1.5 sm:p-3">
        <div className="mb-2 flex items-center justify-between">
          <p className="eyebrow">Collections</p>
          <span className="rounded-full border border-border/60 bg-background/50 px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
            {filteredFolders.length} shown
          </span>
        </div>

        <div className="space-y-2">
          {filteredFolders.map(({ folder, requests }) => (
            <FolderItem
              key={folder.id}
              folder={folder}
              requests={requests}
              activeRequestId={activeRequestId}
              editingItem={editingItem}
              onToggleCollapse={toggleFolderCollapse}
              onSelectRequest={handleSelectRequest}
              onCreateRequest={handleCreateRequest}
              onDeleteFolder={deleteFolder}
              onDeleteRequest={deleteRequest}
              onStartFolderRename={startFolderRename}
              onStartRequestRename={startRequestRename}
              onEditingChange={setEditingItem}
              onCommitRename={commitRename}
              onCancelRename={cancelRename}
            />
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

      <div className="border-t border-border/70 px-4 py-3">
        <p className="text-[11px] leading-5 text-muted-foreground">
          Made with Copilot ❤️
        </p>
      </div>
    </aside>
  );
};
