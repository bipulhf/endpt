import { create } from "zustand";
import { createId } from "../lib/utils";
import { saveLocalData } from "../services/ipc";
import { ApiRequest, Workspace } from "../types";
import { createDefaultRequest, normalizeWorkspace } from "./defaults";

type WorkspaceSnapshot = {
  workspace: Workspace;
  activeRequestId: string | null;
  openRequestIds: string[];
};

type HistoryState = {
  past: WorkspaceSnapshot[];
  future: WorkspaceSnapshot[];
};

interface WorkspaceState {
  workspace: Workspace;
  activeRequestId: string | null;
  openRequestIds: string[];
  history: HistoryState;
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
  canUndo: () => boolean;
  canRedo: () => boolean;
  undo: () => void;
  redo: () => void;
}

const defaultWorkspace: Workspace = {
  version: 2,
  folders: [],
};

const HISTORY_LIMIT = 120;

export const useWorkspaceStore = create<WorkspaceState>((set, get) => ({
  workspace: defaultWorkspace,
  activeRequestId: null,
  openRequestIds: [],
  history: {
    past: [],
    future: [],
  },

  canUndo: () => get().history.past.length > 0,
  canRedo: () => get().history.future.length > 0,

  undo: () => {
    set((state) => {
      const previous = state.history.past[state.history.past.length - 1];
      if (!previous) {
        return {};
      }
      const past = state.history.past.slice(0, -1);
      const future = [
        {
          workspace: state.workspace,
          activeRequestId: state.activeRequestId,
          openRequestIds: state.openRequestIds,
        },
        ...state.history.future,
      ];
      return {
        workspace: previous.workspace,
        activeRequestId: previous.activeRequestId,
        openRequestIds: previous.openRequestIds,
        history: { past, future },
      };
    });
  },

  redo: () => {
    set((state) => {
      const next = state.history.future[0];
      if (!next) {
        return {};
      }
      const future = state.history.future.slice(1);
      const past = [
        ...state.history.past,
        {
          workspace: state.workspace,
          activeRequestId: state.activeRequestId,
          openRequestIds: state.openRequestIds,
        },
      ];
      const trimmedPast =
        past.length > HISTORY_LIMIT ? past.slice(past.length - HISTORY_LIMIT) : past;
      return {
        workspace: next.workspace,
        activeRequestId: next.activeRequestId,
        openRequestIds: next.openRequestIds,
        history: { past: trimmedPast, future },
      };
    });
  },

  createFolder: (name) => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      return;
    }

    set((state) => {
      const past = [
        ...state.history.past,
        {
          workspace: state.workspace,
          activeRequestId: state.activeRequestId,
          openRequestIds: state.openRequestIds,
        },
      ];
      const trimmedPast =
        past.length > HISTORY_LIMIT ? past.slice(past.length - HISTORY_LIMIT) : past;
      return {
        workspace: {
          ...state.workspace,
          folders: [
            ...state.workspace.folders,
            { id: createId(), name: trimmedName, collapsed: false, requests: [] },
          ],
        },
        history: { past: trimmedPast, future: [] },
      };
    });
  },

  deleteFolder: (folderId) => {
    set((state) => {
      const folder = state.workspace.folders.find((item) => item.id === folderId);
      const removedRequestIds = new Set(
        folder?.requests.map((request) => request.id) ?? [],
      );
      const removedActive =
        folder?.requests.some((request) => request.id === state.activeRequestId) ?? false;
      const openRequestIds = state.openRequestIds.filter(
        (requestId) => !removedRequestIds.has(requestId),
      );
      const past = [
        ...state.history.past,
        {
          workspace: state.workspace,
          activeRequestId: state.activeRequestId,
          openRequestIds: state.openRequestIds,
        },
      ];
      const trimmedPast =
        past.length > HISTORY_LIMIT ? past.slice(past.length - HISTORY_LIMIT) : past;

      return {
        workspace: {
          ...state.workspace,
          folders: state.workspace.folders.filter(
            (folderItem) => folderItem.id !== folderId,
          ),
        },
        activeRequestId: removedActive ? null : state.activeRequestId,
        openRequestIds,
        history: { past: trimmedPast, future: [] },
      };
    });
  },

  renameFolder: (folderId, name) => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      return;
    }

    set((state) => {
      const past = [
        ...state.history.past,
        {
          workspace: state.workspace,
          activeRequestId: state.activeRequestId,
          openRequestIds: state.openRequestIds,
        },
      ];
      const trimmedPast =
        past.length > HISTORY_LIMIT ? past.slice(past.length - HISTORY_LIMIT) : past;
      return {
        workspace: {
          ...state.workspace,
          folders: state.workspace.folders.map((folder) =>
            folder.id === folderId ? { ...folder, name: trimmedName } : folder,
          ),
        },
        history: { past: trimmedPast, future: [] },
      };
    });
  },

  toggleFolderCollapse: (folderId) => {
    set((state) => {
      const past = [
        ...state.history.past,
        {
          workspace: state.workspace,
          activeRequestId: state.activeRequestId,
          openRequestIds: state.openRequestIds,
        },
      ];
      const trimmedPast =
        past.length > HISTORY_LIMIT ? past.slice(past.length - HISTORY_LIMIT) : past;
      return {
        workspace: {
          ...state.workspace,
          folders: state.workspace.folders.map((folder) =>
            folder.id === folderId
              ? { ...folder, collapsed: !folder.collapsed }
              : folder,
          ),
        },
        history: { past: trimmedPast, future: [] },
      };
    });
  },

  createRequest: (folderId, name) => {
    const requestName = name.trim() || "New Request";
    const request = createDefaultRequest(requestName);

    set((state) => {
      const past = [
        ...state.history.past,
        {
          workspace: state.workspace,
          activeRequestId: state.activeRequestId,
          openRequestIds: state.openRequestIds,
        },
      ];
      const trimmedPast =
        past.length > HISTORY_LIMIT ? past.slice(past.length - HISTORY_LIMIT) : past;
      return {
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
        history: { past: trimmedPast, future: [] },
      };
    });

    void saveLocalData(get().workspace);
  },

  deleteRequest: (folderId, requestId) => {
    set((state) => {
      const past = [
        ...state.history.past,
        {
          workspace: state.workspace,
          activeRequestId: state.activeRequestId,
          openRequestIds: state.openRequestIds,
        },
      ];
      const trimmedPast =
        past.length > HISTORY_LIMIT ? past.slice(past.length - HISTORY_LIMIT) : past;
      return {
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
        history: { past: trimmedPast, future: [] },
      };
    });
  },

  updateRequest: (requestId, partial) => {
    set((state) => {
      const past = [
        ...state.history.past,
        {
          workspace: state.workspace,
          activeRequestId: state.activeRequestId,
          openRequestIds: state.openRequestIds,
        },
      ];
      const trimmedPast =
        past.length > HISTORY_LIMIT ? past.slice(past.length - HISTORY_LIMIT) : past;
      return {
        workspace: {
          ...state.workspace,
          folders: state.workspace.folders.map((folder) => ({
            ...folder,
            requests: folder.requests.map((request) =>
              request.id === requestId ? { ...request, ...partial } : request,
            ),
          })),
        },
        history: { past: trimmedPast, future: [] },
      };
    });
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
      const fallbackId =
        openRequestIds[closeIndex] ?? openRequestIds[closeIndex - 1] ?? null;
      const past = [
        ...state.history.past,
        {
          workspace: state.workspace,
          activeRequestId: state.activeRequestId,
          openRequestIds: state.openRequestIds,
        },
      ];
      const trimmedPast =
        past.length > HISTORY_LIMIT ? past.slice(past.length - HISTORY_LIMIT) : past;

      return {
        openRequestIds,
        activeRequestId: isActiveClosing ? fallbackId : state.activeRequestId,
        history: { past: trimmedPast, future: [] },
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
      history: { past: [], future: [] },
    });
  },
}));
