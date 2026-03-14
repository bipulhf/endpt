import { create } from "zustand";
import { saveLocalData } from "../services/ipc";
import { ApiRequest, AuthConfig, HeaderRow, RequestBody, Workspace } from "../types";

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

const createDefaultAuth = (): AuthConfig => ({
  type: "none",
  bearer: { token: "" },
  basic: { username: "", password: "" },
  apiKey: { key: "", value: "", addTo: "header" },
});

const createDefaultBody = (): RequestBody => ({
  type: "none",
  raw: "",
  rawLanguage: "text",
  formData: [],
  urlEncoded: [],
  binaryFilePath: null,
  graphql: {
    query: "",
    variables: "",
  },
});

const normalizeAuth = (auth: unknown): AuthConfig => {
  if (!auth || typeof auth !== "object") {
    return createDefaultAuth();
  }
  const partial = auth as Partial<AuthConfig>;
  return {
    ...createDefaultAuth(),
    ...partial,
    bearer: { ...createDefaultAuth().bearer, ...(partial.bearer ?? {}) },
    basic: { ...createDefaultAuth().basic, ...(partial.basic ?? {}) },
    apiKey: { ...createDefaultAuth().apiKey, ...(partial.apiKey ?? {}) },
  };
};

const normalizeBody = (body: unknown): RequestBody => {
  if (typeof body === "string") {
    return {
      ...createDefaultBody(),
      type: body.trim().length > 0 ? "json" : "none",
      raw: body,
      rawLanguage: "json",
    };
  }

  if (!body || typeof body !== "object") {
    return createDefaultBody();
  }

  const partial = body as Partial<RequestBody>;
  return {
    ...createDefaultBody(),
    ...partial,
    graphql: {
      ...createDefaultBody().graphql,
      ...(partial.graphql ?? {}),
    },
    formData: Array.isArray(partial.formData) ? partial.formData : [],
    urlEncoded: Array.isArray(partial.urlEncoded) ? partial.urlEncoded : [],
  };
};

const normalizeWorkspace = (data: Workspace): Workspace => ({
  version: 2,
  folders: data.folders.map((folder) => ({
    ...folder,
    requests: folder.requests.map((request) => ({
      ...request,
      queryParams: Array.isArray(request.queryParams) ? request.queryParams : [],
      auth: normalizeAuth(request.auth),
      body: normalizeBody(request.body),
      lastResponse: request.lastResponse ?? null,
    })),
  })),
});

const createDefaultRequest = (name: string): ApiRequest => ({
  id: createId(),
  name,
  method: "GET",
  url: "",
  headers: [createDefaultHeader()],
  queryParams: [],
  auth: createDefaultAuth(),
  body: createDefaultBody(),
  lastResponse: null,
});

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
