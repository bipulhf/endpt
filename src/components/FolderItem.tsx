import {
  ChevronDown,
  ChevronRight,
  FilePlus,
  Trash2,
} from "lucide-react";
import { ReactElement } from "react";
import { METHOD_BADGE_CLASSES } from "../constants/methods";
import { ApiRequest, Folder } from "../types";

export type EditingItem =
  | { kind: "folder"; id: string; value: string }
  | { kind: "request"; id: string; folderId: string; value: string };

interface FolderItemProps {
  folder: Folder;
  requests: ApiRequest[];
  activeRequestId: string | null;
  editingItem: EditingItem | null;
  onToggleCollapse: (folderId: string) => void;
  onSelectRequest: (requestId: string) => void;
  onCreateRequest: (folderId: string) => void;
  onDeleteFolder: (folderId: string) => void;
  onDeleteRequest: (folderId: string, requestId: string) => void;
  onStartFolderRename: (folderId: string, name: string) => void;
  onStartRequestRename: (folderId: string, requestId: string, name: string) => void;
  onEditingChange: (item: EditingItem | null) => void;
  onCommitRename: () => void;
  onCancelRename: () => void;
}

export const FolderItem = ({
  folder,
  requests,
  activeRequestId,
  editingItem,
  onToggleCollapse,
  onSelectRequest,
  onCreateRequest,
  onDeleteFolder,
  onDeleteRequest,
  onStartFolderRename,
  onStartRequestRename,
  onEditingChange,
  onCommitRename,
  onCancelRename,
}: FolderItemProps): ReactElement => (
  <div className="panel-subtle rounded-[0.95rem] p-1.5 sm:rounded-[1rem] sm:p-2">
    <div className="flex items-center gap-1.5 p-0.5">
      <button
        type="button"
        onClick={() => onToggleCollapse(folder.id)}
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
        onDoubleClick={() => onStartFolderRename(folder.id, folder.name)}
        title="Double-click to rename"
      >
        {editingItem?.kind === "folder" &&
        editingItem.id === folder.id ? (
          <input
            autoFocus
            value={editingItem.value}
            onChange={(event) =>
              onEditingChange(
                editingItem.kind === "folder" && editingItem.id === folder.id
                  ? { ...editingItem, value: event.target.value }
                  : editingItem,
              )
            }
            onBlur={onCommitRename}
            onClick={(event) => event.stopPropagation()}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                onCommitRename();
              }
              if (event.key === "Escape") {
                event.preventDefault();
                onCancelRename();
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
        onClick={() => onCreateRequest(folder.id)}
        className="inline-flex min-h-[2.5rem] min-w-[2.5rem] items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-accent/50 hover:text-foreground"
        aria-label="New request"
      >
        <FilePlus size={15} />
      </button>
      <button
        type="button"
        onClick={() => onDeleteFolder(folder.id)}
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
                className={`inline-flex rounded-full border px-2 py-1 text-[10px] font-semibold ${METHOD_BADGE_CLASSES[request.method]}`}
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
                      onEditingChange(
                        editingItem.kind === "request" &&
                        editingItem.id === request.id
                          ? { ...editingItem, value: event.target.value }
                          : editingItem,
                      )
                    }
                    onBlur={onCommitRename}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        onCommitRename();
                      }
                      if (event.key === "Escape") {
                        event.preventDefault();
                        onCancelRename();
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
                  onClick={() => onSelectRequest(request.id)}
                >
                  <div
                    className="min-w-0"
                    onDoubleClick={(event) => {
                      event.stopPropagation();
                      onStartRequestRename(
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
              onClick={() => onDeleteRequest(folder.id, request.id)}
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
);
