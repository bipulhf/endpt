import { create } from "zustand";
import { ApiRequest, HeaderRow, Workspace } from "../types";

interface WorkspaceState {
  workspace: Workspace;
  activeRequestId: string | null;
  createFolder: (name: string) => void;
  deleteFolder: (folderId: string) => void;
  renameFolder: (folderId: string, name: string) => void;
  toggleFolderCollapse: (folderId: string) => void;
  createRequest: (folderId: string, name: string) => void;
  deleteRequest: (folderId: string, requestId: string) => void;
  updateRequest: (requestId: string, partial: Partial<ApiRequest>) => void;
  setActiveRequest: (id: string | null) => void;
  getActiveRequest: () => ApiRequest | undefined;
  loadWorkspaceFromData: (data: Workspace) => void;
}

const createId = (): string => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2);
};

const createDefaultHeader = (): HeaderRow => ({
  id: createId(),
  key: "",
  value: "",
  enabled: true,
});

const createDefaultRequest = (name: string): ApiRequest => ({
  id: createId(),
  name,
  method: "GET",
  url: "",
  headers: [createDefaultHeader()],
  body: "",
});

const defaultWorkspace: Workspace = {
  version: 1,
  folders: [],
};

export const useWorkspaceStore = create<WorkspaceState>((set, get) => ({
  workspace: defaultWorkspace,
  activeRequestId: null,

  createFolder: (name) => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      return;
    }

    set((state) => ({
      workspace: {
        ...state.workspace,
        folders: [
          ...state.workspace.folders,
          { id: createId(), name: trimmedName, collapsed: false, requests: [] },
        ],
      },
    }));
  },

  deleteFolder: (folderId) => {
    set((state) => {
      const folder = state.workspace.folders.find((item) => item.id === folderId);
      const removedActive =
        folder?.requests.some((request) => request.id === state.activeRequestId) ?? false;

      return {
        workspace: {
          ...state.workspace,
          folders: state.workspace.folders.filter((folderItem) => folderItem.id !== folderId),
        },
        activeRequestId: removedActive ? null : state.activeRequestId,
      };
    });
  },

  renameFolder: (folderId, name) => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      return;
    }

    set((state) => ({
      workspace: {
        ...state.workspace,
        folders: state.workspace.folders.map((folder) =>
          folder.id === folderId ? { ...folder, name: trimmedName } : folder,
        ),
      },
    }));
  },

  toggleFolderCollapse: (folderId) => {
    set((state) => ({
      workspace: {
        ...state.workspace,
        folders: state.workspace.folders.map((folder) =>
          folder.id === folderId ? { ...folder, collapsed: !folder.collapsed } : folder,
        ),
      },
    }));
  },

  createRequest: (folderId, name) => {
    const requestName = name.trim() || "New Request";
    const request = createDefaultRequest(requestName);

    set((state) => ({
      workspace: {
        ...state.workspace,
        folders: state.workspace.folders.map((folder) =>
          folder.id === folderId
            ? { ...folder, requests: [...folder.requests, request] }
            : folder,
        ),
      },
      activeRequestId: request.id,
    }));
  },

  deleteRequest: (folderId, requestId) => {
    set((state) => ({
      workspace: {
        ...state.workspace,
        folders: state.workspace.folders.map((folder) =>
          folder.id === folderId
            ? {
              ...folder,
              requests: folder.requests.filter((request) => request.id !== requestId),
            }
            : folder,
        ),
      },
      activeRequestId: state.activeRequestId === requestId ? null : state.activeRequestId,
    }));
  },

  updateRequest: (requestId, partial) => {
    set((state) => ({
      workspace: {
        ...state.workspace,
        folders: state.workspace.folders.map((folder) => ({
          ...folder,
          requests: folder.requests.map((request) =>
            request.id === requestId ? { ...request, ...partial } : request,
          ),
        })),
      },
    }));
  },

  setActiveRequest: (id) => {
    set({ activeRequestId: id });
  },

  getActiveRequest: () => {
    const state = get();
    for (const folder of state.workspace.folders) {
      const request = folder.requests.find((item) => item.id === state.activeRequestId);
      if (request) {
        return request;
      }
    }
    return undefined;
  },

  loadWorkspaceFromData: (data) => {
    set({ workspace: data, activeRequestId: null });
  },
}));
