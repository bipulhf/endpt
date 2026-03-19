import { create } from "zustand";
import { createId } from "../lib/utils";
import { saveLocalData } from "../services/ipc";
import { ApiRequest, Environment, EnvironmentVariable, Workspace } from "../types";
import {
  createDefaultGrpcConfig,
  createDefaultEnvironment,
  createDefaultEnvironmentVariable,
  createDefaultRequest,
  createDefaultSseConfig,
  createDefaultWebSocketConfig,
  ENV_KEY_PATTERN,
  normalizeWorkspace,
  WORKSPACE_VERSION,
} from "./defaults";

type WorkspaceSnapshot = {
  workspace: Workspace;
  activeRequestId: string | null;
  openRequestIds: string[];
};

type HistoryState = {
  past: WorkspaceSnapshot[];
  future: WorkspaceSnapshot[];
};

type VariableUpdateResult = {
  ok: boolean;
  error?: string;
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
  setRequestProtocol: (requestId: string, protocol: ApiRequest["protocol"]) => void;
  updateGrpcConfig: (
    requestId: string,
    partial: Partial<ApiRequest["grpc"]>,
  ) => void;
  updateWebSocketConfig: (
    requestId: string,
    partial: Partial<ApiRequest["websocket"]>,
  ) => void;
  updateSseConfig: (requestId: string, partial: Partial<ApiRequest["sse"]>) => void;
  createEnvironment: (name?: string) => void;
  renameEnvironment: (environmentId: string, name: string) => void;
  deleteEnvironment: (environmentId: string) => void;
  setActiveEnvironment: (environmentId: string | null) => void;
  addEnvironmentVariable: (environmentId: string) => void;
  updateEnvironmentVariable: (
    environmentId: string,
    variableId: string,
    partial: Partial<EnvironmentVariable>,
  ) => VariableUpdateResult;
  deleteEnvironmentVariable: (environmentId: string, variableId: string) => void;
  getActiveRequest: () => ApiRequest | undefined;
  getActiveEnvironment: () => Environment | null;
  getActiveEnvironmentVariables: () => EnvironmentVariable[];
  getActiveEnvironmentMap: () => Record<string, string>;
  loadWorkspaceFromData: (data: Workspace) => void;
  canUndo: () => boolean;
  canRedo: () => boolean;
  undo: () => void;
  redo: () => void;
}

const defaultWorkspace: Workspace = {
  version: WORKSPACE_VERSION,
  folders: [],
  environments: [],
  activeEnvironmentId: null,
};

const HISTORY_LIMIT = 120;

const snapshotState = (state: WorkspaceState): WorkspaceSnapshot => ({
  workspace: state.workspace,
  activeRequestId: state.activeRequestId,
  openRequestIds: state.openRequestIds,
});

const buildNextHistory = (state: WorkspaceState): HistoryState => {
  const past = [...state.history.past, snapshotState(state)];
  const trimmedPast =
    past.length > HISTORY_LIMIT ? past.slice(past.length - HISTORY_LIMIT) : past;
  return { past: trimmedPast, future: [] };
};

const findEnvironment = (
  workspace: Workspace,
  environmentId: string,
): Environment | undefined =>
  workspace.environments.find((environment) => environment.id === environmentId);

const nextEnvironmentName = (workspace: Workspace): string => {
  let index = workspace.environments.length + 1;
  let candidate = `Environment ${index}`;
  const existing = new Set(workspace.environments.map((environment) => environment.name));
  while (existing.has(candidate)) {
    index += 1;
    candidate = `Environment ${index}`;
  }
  return candidate;
};

const validateVariableKey = (
  key: string,
  environment: Environment,
  variableId: string,
): string | null => {
  if (!key) {
    return null;
  }

  if (!ENV_KEY_PATTERN.test(key)) {
    return "Variable key must match [A-Za-z_][A-Za-z0-9_]*";
  }

  const duplicate = environment.variables.some(
    (variable) => variable.id !== variableId && variable.key === key,
  );

  if (duplicate) {
    return `Variable key '${key}' already exists in this environment`;
  }

  return null;
};

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
      const future = [snapshotState(state), ...state.history.future];
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
      const past = [...state.history.past, snapshotState(state)];
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

    set((state) => ({
      workspace: {
        ...state.workspace,
        folders: [
          ...state.workspace.folders,
          { id: createId(), name: trimmedName, collapsed: false, requests: [] },
        ],
      },
      history: buildNextHistory(state),
    }));
  },

  deleteFolder: (folderId) => {
    set((state) => {
      const folder = state.workspace.folders.find((item) => item.id === folderId);
      const removedRequestIds = new Set(folder?.requests.map((request) => request.id) ?? []);
      const removedActive =
        folder?.requests.some((request) => request.id === state.activeRequestId) ?? false;
      const openRequestIds = state.openRequestIds.filter(
        (requestId) => !removedRequestIds.has(requestId),
      );

      return {
        workspace: {
          ...state.workspace,
          folders: state.workspace.folders.filter(
            (folderItem) => folderItem.id !== folderId,
          ),
        },
        activeRequestId: removedActive ? null : state.activeRequestId,
        openRequestIds,
        history: buildNextHistory(state),
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
      history: buildNextHistory(state),
    }));
  },

  toggleFolderCollapse: (folderId) => {
    set((state) => ({
      workspace: {
        ...state.workspace,
        folders: state.workspace.folders.map((folder) =>
          folder.id === folderId
            ? { ...folder, collapsed: !folder.collapsed }
            : folder,
        ),
      },
      history: buildNextHistory(state),
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
      history: buildNextHistory(state),
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
      history: buildNextHistory(state),
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
      history: buildNextHistory(state),
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
      const fallbackId =
        openRequestIds[closeIndex] ?? openRequestIds[closeIndex - 1] ?? null;

      return {
        openRequestIds,
        activeRequestId: isActiveClosing ? fallbackId : state.activeRequestId,
        history: buildNextHistory(state),
      };
    });
  },

  setRequestProtocol: (requestId, protocol) => {
    set((state) => ({
      workspace: {
        ...state.workspace,
        folders: state.workspace.folders.map((folder) => ({
          ...folder,
          requests: folder.requests.map((request) =>
            request.id === requestId
              ? {
                ...request,
                protocol,
                grpc: request.grpc ?? createDefaultGrpcConfig(),
                websocket: request.websocket ?? createDefaultWebSocketConfig(),
                sse: request.sse ?? createDefaultSseConfig(),
              }
              : request,
          ),
        })),
      },
      history: buildNextHistory(state),
    }));
  },

  updateGrpcConfig: (requestId, partial) => {
    set((state) => ({
      workspace: {
        ...state.workspace,
        folders: state.workspace.folders.map((folder) => ({
          ...folder,
          requests: folder.requests.map((request) =>
            request.id === requestId
              ? {
                ...request,
                grpc: {
                  ...(request.grpc ?? createDefaultGrpcConfig()),
                  ...partial,
                  protoFiles: Array.isArray(partial.protoFiles)
                    ? partial.protoFiles
                    : request.grpc?.protoFiles ?? [],
                  metadata: Array.isArray(partial.metadata)
                    ? partial.metadata
                    : request.grpc?.metadata ?? [],
                },
              }
              : request,
          ),
        })),
      },
      history: buildNextHistory(state),
    }));
  },

  updateWebSocketConfig: (requestId, partial) => {
    set((state) => ({
      workspace: {
        ...state.workspace,
        folders: state.workspace.folders.map((folder) => ({
          ...folder,
          requests: folder.requests.map((request) =>
            request.id === requestId
              ? {
                ...request,
                websocket: {
                  ...(request.websocket ?? createDefaultWebSocketConfig()),
                  ...partial,
                  headers: Array.isArray(partial.headers)
                    ? partial.headers
                    : request.websocket?.headers ?? [],
                },
              }
              : request,
          ),
        })),
      },
      history: buildNextHistory(state),
    }));
  },

  updateSseConfig: (requestId, partial) => {
    set((state) => ({
      workspace: {
        ...state.workspace,
        folders: state.workspace.folders.map((folder) => ({
          ...folder,
          requests: folder.requests.map((request) =>
            request.id === requestId
              ? {
                ...request,
                sse: {
                  ...(request.sse ?? createDefaultSseConfig()),
                  ...partial,
                  headers: Array.isArray(partial.headers)
                    ? partial.headers
                    : request.sse?.headers ?? [],
                },
              }
              : request,
          ),
        })),
      },
      history: buildNextHistory(state),
    }));
  },

  createEnvironment: (name) => {
    set((state) => {
      const trimmedName = name?.trim() || nextEnvironmentName(state.workspace);
      const environment = createDefaultEnvironment(trimmedName);
      return {
        workspace: {
          ...state.workspace,
          environments: [...state.workspace.environments, environment],
          activeEnvironmentId: state.workspace.activeEnvironmentId ?? environment.id,
        },
        history: buildNextHistory(state),
      };
    });
  },

  renameEnvironment: (environmentId, name) => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      return;
    }

    set((state) => ({
      workspace: {
        ...state.workspace,
        environments: state.workspace.environments.map((environment) =>
          environment.id === environmentId
            ? { ...environment, name: trimmedName }
            : environment,
        ),
      },
      history: buildNextHistory(state),
    }));
  },

  deleteEnvironment: (environmentId) => {
    set((state) => {
      const environments = state.workspace.environments.filter(
        (environment) => environment.id !== environmentId,
      );
      const activeEnvironmentId =
        state.workspace.activeEnvironmentId === environmentId
          ? environments[0]?.id ?? null
          : state.workspace.activeEnvironmentId;

      return {
        workspace: {
          ...state.workspace,
          environments,
          activeEnvironmentId,
        },
        history: buildNextHistory(state),
      };
    });
  },

  setActiveEnvironment: (environmentId) => {
    set((state) => {
      if (
        environmentId !== null &&
        !findEnvironment(state.workspace, environmentId)
      ) {
        return {};
      }

      return {
        workspace: {
          ...state.workspace,
          activeEnvironmentId: environmentId,
        },
        history: buildNextHistory(state),
      };
    });
  },

  addEnvironmentVariable: (environmentId) => {
    set((state) => ({
      workspace: {
        ...state.workspace,
        environments: state.workspace.environments.map((environment) =>
          environment.id === environmentId
            ? {
              ...environment,
              variables: [...environment.variables, createDefaultEnvironmentVariable()],
            }
            : environment,
        ),
      },
      history: buildNextHistory(state),
    }));
  },

  updateEnvironmentVariable: (environmentId, variableId, partial) => {
    let validationError: string | undefined;

    set((state) => {
      const environment = findEnvironment(state.workspace, environmentId);
      if (!environment) {
        validationError = "Environment not found";
        return {};
      }

      const variable = environment.variables.find((item) => item.id === variableId);
      if (!variable) {
        validationError = "Variable not found";
        return {};
      }

      const nextKey =
        typeof partial.key === "string" ? partial.key.trim() : variable.key;
      const nextValue =
        typeof partial.value === "string" ? partial.value : variable.value;
      const nextIsSecret =
        typeof partial.isSecret === "boolean"
          ? partial.isSecret
          : variable.isSecret;

      const keyError = validateVariableKey(nextKey, environment, variableId);
      if (keyError) {
        validationError = keyError;
        return {};
      }

      return {
        workspace: {
          ...state.workspace,
          environments: state.workspace.environments.map((current) =>
            current.id === environmentId
              ? {
                ...current,
                variables: current.variables.map((item) =>
                  item.id === variableId
                    ? {
                      ...item,
                      key: nextKey,
                      value: nextValue,
                      isSecret: nextIsSecret,
                    }
                    : item,
                ),
              }
              : current,
          ),
        },
        history: buildNextHistory(state),
      };
    });

    return validationError
      ? { ok: false, error: validationError }
      : { ok: true };
  },

  deleteEnvironmentVariable: (environmentId, variableId) => {
    set((state) => ({
      workspace: {
        ...state.workspace,
        environments: state.workspace.environments.map((environment) =>
          environment.id === environmentId
            ? {
              ...environment,
              variables: environment.variables.filter(
                (variable) => variable.id !== variableId,
              ),
            }
            : environment,
        ),
      },
      history: buildNextHistory(state),
    }));
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

  getActiveEnvironment: () => {
    const state = get();
    if (!state.workspace.activeEnvironmentId) {
      return null;
    }

    return (
      state.workspace.environments.find(
        (environment) => environment.id === state.workspace.activeEnvironmentId,
      ) ?? null
    );
  },

  getActiveEnvironmentVariables: () => {
    return get().getActiveEnvironment()?.variables ?? [];
  },

  getActiveEnvironmentMap: () => {
    const map: Record<string, string> = {};
    for (const variable of get().getActiveEnvironmentVariables()) {
      map[variable.key] = variable.value;
    }
    return map;
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
