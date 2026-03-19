import { beforeEach, describe, expect, it } from "vitest";
import { normalizeWorkspace } from "../../store/defaults";
import { useWorkspaceStore } from "../../store/useWorkspaceStore";

beforeEach(() => {
  useWorkspaceStore.setState({
    workspace: {
      version: 4,
      folders: [],
      environments: [],
      activeEnvironmentId: null,
    },
    activeRequestId: null,
    openRequestIds: [],
    history: { past: [], future: [] },
  });
});

describe("createFolder", () => {
  it("adds a folder with the given name", () => {
    useWorkspaceStore.getState().createFolder("Auth");
    const folders = useWorkspaceStore.getState().workspace.folders;

    expect(folders).toHaveLength(1);
    expect(folders[0].name).toBe("Auth");
    expect(folders[0].collapsed).toBe(false);
  });

  it("adds multiple folders", () => {
    useWorkspaceStore.getState().createFolder("Auth");
    useWorkspaceStore.getState().createFolder("Users");

    const folders = useWorkspaceStore.getState().workspace.folders;
    expect(folders).toHaveLength(2);
    expect(folders.map((folder) => folder.name)).toEqual(["Auth", "Users"]);
  });
});

describe("createRequest", () => {
  it("adds a request to the correct folder", () => {
    useWorkspaceStore.getState().createFolder("Auth");
    const folder = useWorkspaceStore.getState().workspace.folders[0];

    useWorkspaceStore.getState().createRequest(folder.id, "Login");

    const updated = useWorkspaceStore.getState().workspace.folders[0];
    expect(updated.requests).toHaveLength(1);
    expect(updated.requests[0].name).toBe("Login");
    expect(updated.requests[0].method).toBe("GET");
    expect(updated.requests[0].body.type).toBe("none");
  });

  it("sets the new request as active", () => {
    useWorkspaceStore.getState().createFolder("Auth");
    const folder = useWorkspaceStore.getState().workspace.folders[0];

    useWorkspaceStore.getState().createRequest(folder.id, "Login");

    const state = useWorkspaceStore.getState();
    expect(state.activeRequestId).toBe(state.workspace.folders[0].requests[0].id);
  });
});

describe("environments", () => {
  it("creates and activates the first environment", () => {
    useWorkspaceStore.getState().createEnvironment("Development");

    const workspace = useWorkspaceStore.getState().workspace;
    expect(workspace.environments).toHaveLength(1);
    expect(workspace.environments[0].name).toBe("Development");
    expect(workspace.activeEnvironmentId).toBe(workspace.environments[0].id);
  });

  it("enforces unique keys per environment", () => {
    const state = useWorkspaceStore.getState();
    state.createEnvironment("Development");

    const environmentId = useWorkspaceStore.getState().workspace.environments[0].id;
    state.addEnvironmentVariable(environmentId);
    state.addEnvironmentVariable(environmentId);

    const [first, second] =
      useWorkspaceStore.getState().workspace.environments[0].variables;

    expect(
      state.updateEnvironmentVariable(environmentId, first.id, {
        key: "BASE_URL",
      }),
    ).toEqual({ ok: true });

    expect(
      state.updateEnvironmentVariable(environmentId, second.id, {
        key: "BASE_URL",
      }),
    ).toEqual({
      ok: false,
      error: "Variable key 'BASE_URL' already exists in this environment",
    });
  });
});

describe("workspace normalization", () => {
  it("upgrades old workspaces with env defaults", () => {
    const normalized = normalizeWorkspace({ version: 2, folders: [] });

    expect(normalized.version).toBe(4);
    expect(normalized.environments).toEqual([]);
    expect(normalized.activeEnvironmentId).toBeNull();
  });

  it("defaults missing protocol fields to http", () => {
    const normalized = normalizeWorkspace({
      version: 3,
      folders: [
        {
          id: "folder_1",
          name: "Folder",
          collapsed: false,
          requests: [
            {
              id: "request_1",
              name: "Legacy",
              method: "GET",
              url: "https://example.com",
              headers: [],
              queryParams: [],
              auth: { type: "none" },
              body: { type: "none" },
            },
          ],
        },
      ],
    });

    expect(normalized.folders[0].requests[0].protocol).toBe("http");
    expect(normalized.folders[0].requests[0].grpc.endpoint).toBe("");
    expect(normalized.folders[0].requests[0].websocket.url).toBe("");
    expect(normalized.folders[0].requests[0].sse.url).toBe("");
  });
});

describe("undo/redo", () => {
  it("restores the previous workspace snapshot", () => {
    useWorkspaceStore.getState().createFolder("Auth");
    expect(useWorkspaceStore.getState().workspace.folders).toHaveLength(1);

    useWorkspaceStore.getState().undo();
    expect(useWorkspaceStore.getState().workspace.folders).toHaveLength(0);

    useWorkspaceStore.getState().redo();
    expect(useWorkspaceStore.getState().workspace.folders).toHaveLength(1);
  });
});
