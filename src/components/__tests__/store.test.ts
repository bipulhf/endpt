import { beforeEach, describe, expect, it } from "vitest";
import { useWorkspaceStore } from "../../store/useWorkspaceStore";

beforeEach(() => {
  useWorkspaceStore.setState({
    workspace: { version: 2, folders: [] },
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
