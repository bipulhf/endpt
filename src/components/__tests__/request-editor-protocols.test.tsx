import { act, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { RequestEditor } from "../RequestEditor";
import { createDefaultRequest } from "../../store/defaults";
import { useWorkspaceStore } from "../../store/useWorkspaceStore";

vi.mock("../../services/ipc", () => ({
  executeHttpRequest: vi.fn(),
  executeGrpcUnaryRequest: vi.fn(),
  importGrpcProtoFiles: vi.fn(),
  listGrpcMethods: vi.fn(),
  wsConnect: vi.fn(),
  wsSend: vi.fn(),
  wsDisconnect: vi.fn(),
  sseConnect: vi.fn(),
  sseDisconnect: vi.fn(),
  saveLocalData: vi.fn(),
}));

const seed = (): string => {
  const request = createDefaultRequest("Protocol Test");

  useWorkspaceStore.setState({
    workspace: {
      version: 4,
      folders: [
        {
          id: "folder_1",
          name: "Default",
          collapsed: false,
          requests: [request],
        },
      ],
      environments: [],
      activeEnvironmentId: null,
    },
    activeRequestId: request.id,
    openRequestIds: [request.id],
    history: { past: [], future: [] },
  });

  return request.id;
};

describe("RequestEditor protocol views", () => {
  beforeEach(() => {
    seed();
  });

  it("renders the gRPC editor when request protocol is grpc", () => {
    const requestId = useWorkspaceStore.getState().activeRequestId as string;
    act(() => {
      useWorkspaceStore.getState().setRequestProtocol(requestId, "grpc");
    });

    render(<RequestEditor isBusy={false} setIsBusy={vi.fn()} />);

    expect(screen.getByText(/gRPC Unary/i)).toBeInTheDocument();
  });

  it("renders websocket and sse protocol editors", () => {
    const requestId = useWorkspaceStore.getState().activeRequestId as string;

    act(() => {
      useWorkspaceStore.getState().setRequestProtocol(requestId, "websocket");
    });
    const { rerender } = render(<RequestEditor isBusy={false} setIsBusy={vi.fn()} />);
    expect(screen.getByText(/WebSocket Session/i)).toBeInTheDocument();

    act(() => {
      useWorkspaceStore.getState().setRequestProtocol(requestId, "sse");
    });
    rerender(<RequestEditor isBusy={false} setIsBusy={vi.fn()} />);
    expect(screen.getByText(/Server-Sent Events/i)).toBeInTheDocument();
  });
});
