import { create } from "zustand";
import { createId } from "../lib/utils";
import { saveLocalData } from "../services/ipc";
import { ApiRequest, Workspace } from "../types";
import { createDefaultRequest, normalizeWorkspace } from "./defaults";

interface WorkspaceState {
  workspace: Workspace;
  activeRequestId: string | null;
  openRequestIds: string[];
  createFolder: (name: string) => void;
  deleteFolder: (folderId: string) => void;
  renameFolder: (folderId: string, name: string) => void;
  toggleFolderCollapse: (folderId: string) => void;
  createRequest: (folderId: string, name: string) => void;
  deleteRequest: (folderId: string, requestId: string) => void;
  updateRequest: (requestId: string, partial: Partial<ApiRequest>) => void;
  setActiveRequest: (id: string | null) => void;
  closeRequestTab: (id: string) => void;
  getActiveRequest: () => ApiRequest | undefined;
  loadWorkspaceFromData: (data: Workspace) => void;
}

const defaultWorkspace: Workspace = {
  version: 2,
  folders: [],
};

export const useWorkspaceStore = create<WorkspaceState>((set, get) => ({
  workspace: defaultWorkspace,
  activeRequestId: null,
  openRequestIds: [],

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
      const removedRequestIds = new Set(folder?.requests.map((request) => request.id) ?? []);
      const removedActive =
        folder?.requests.some((request) => request.id === state.activeRequestId) ?? false;
      const openRequestIds = state.openRequestIds.filter((requestId) => !removedRequestIds.has(requestId));

      return {
        workspace: {
          ...state.workspace,
          folders: state.workspace.folders.filter((folderItem) => folderItem.id !== folderId),
        },
        activeRequestId: removedActive ? null : state.activeRequestId,
        openRequestIds,
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
      openRequestIds: state.openRequestIds.includes(request.id)
        ? state.openRequestIds
        : [...state.openRequestIds, request.id],
    }));

    void saveLocalData(get().workspace);
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
      openRequestIds: state.openRequestIds.filter((id) => id !== requestId),
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
    set((state) => {
      if (!id) {
        return { activeRequestId: null };
      }

      return {
        activeRequestId: id,
        openRequestIds: state.openRequestIds.includes(id)
          ? state.openRequestIds
          : [...state.openRequestIds, id],
      };
    });
  },

  closeRequestTab: (id) => {
    set((state) => {
      const closeIndex = state.openRequestIds.indexOf(id);
      if (closeIndex < 0) {
        return {};
      }

      const openRequestIds = state.openRequestIds.filter((requestId) => requestId !== id);
      const isActiveClosing = state.activeRequestId === id;

      if (!isActiveClosing) {
        return { openRequestIds };
      }

      const fallbackId =
        openRequestIds[closeIndex] ??
        openRequestIds[closeIndex - 1] ??
        null;

      return {
        openRequestIds,
        activeRequestId: fallbackId,
      };
    });
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
    set({
      workspace: normalizeWorkspace(data),
      activeRequestId: null,
      openRequestIds: [],
    });
  },
}));
