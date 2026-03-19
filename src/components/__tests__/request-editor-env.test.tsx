import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { RequestEditor } from "../RequestEditor";
import { createDefaultRequest } from "../../store/defaults";
import { useWorkspaceStore } from "../../store/useWorkspaceStore";

const executeHttpRequestMock = vi.fn();

vi.mock("../../services/ipc", () => ({
  executeHttpRequest: (...args: unknown[]) => executeHttpRequestMock(...args),
  saveLocalData: vi.fn(),
}));

const setupWorkspace = (withVariable: boolean): void => {
  const request = createDefaultRequest("Get Users");
  request.url = "{{BASE_URL}}/users";

  const environments = [
    {
      id: "env_dev",
      name: "Dev",
      variables: withVariable
        ? [
          {
            id: "v1",
            key: "BASE_URL",
            value: "https://api.example.com",
            isSecret: false,
          },
        ]
        : [],
    },
  ];

  useWorkspaceStore.setState({
    workspace: {
      version: 3,
      folders: [
        {
          id: "folder_1",
          name: "Default",
          collapsed: false,
          requests: [request],
        },
      ],
      environments,
      activeEnvironmentId: "env_dev",
    },
    activeRequestId: request.id,
    openRequestIds: [request.id],
    history: { past: [], future: [] },
  });
};

beforeEach(() => {
  executeHttpRequestMock.mockReset();
});

describe("RequestEditor environment resolution", () => {
  it("blocks send when unresolved variables exist", async () => {
    setupWorkspace(false);

    render(
      <RequestEditor
        onResponse={vi.fn()}
        isSending={false}
        setIsSending={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /send/i }));

    expect(executeHttpRequestMock).not.toHaveBeenCalled();
    const errors = await screen.findAllByText(/Unresolved variables/i);
    expect(errors.length).toBeGreaterThan(0);
  });

  it("sends resolved request when variables are available", async () => {
    setupWorkspace(true);
    executeHttpRequestMock.mockResolvedValue({
      status: 200,
      headers: {},
      body: "{}",
      elapsed_ms: 10,
      size_bytes: 2,
    });

    render(
      <RequestEditor
        onResponse={vi.fn()}
        isSending={false}
        setIsSending={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /send/i }));

    await waitFor(() => expect(executeHttpRequestMock).toHaveBeenCalledTimes(1));

    const sentRequest = executeHttpRequestMock.mock.calls[0][0];
    expect(sentRequest.url).toBe("https://api.example.com/users");
  });
});
