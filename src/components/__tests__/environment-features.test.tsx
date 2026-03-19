import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { EnvironmentManager } from "../EnvironmentManager";
import { EnvAutocompleteField } from "../EnvAutocompleteField";
import { useWorkspaceStore } from "../../store/useWorkspaceStore";

vi.mock("sonner", () => ({
  toast: {
    error: vi.fn(),
  },
}));

beforeEach(() => {
  useWorkspaceStore.setState({
    workspace: {
      version: 3,
      folders: [],
      environments: [],
      activeEnvironmentId: null,
    },
    activeRequestId: null,
    openRequestIds: [],
    history: { past: [], future: [] },
  });
});

describe("EnvironmentManager", () => {
  it("creates an environment and variables", () => {
    render(<EnvironmentManager open onClose={() => {}} />);

    fireEvent.click(screen.getByLabelText("Create environment"));

    const workspace = useWorkspaceStore.getState().workspace;
    expect(workspace.environments).toHaveLength(1);

    fireEvent.click(screen.getByRole("button", { name: /add variable/i }));

    const updated = useWorkspaceStore.getState().workspace;
    expect(updated.environments[0].variables).toHaveLength(1);

    fireEvent.change(screen.getByPlaceholderText("API_BASE_URL"), {
      target: { value: "BASE_URL" },
    });

    expect(
      useWorkspaceStore.getState().workspace.environments[0].variables[0].key,
    ).toBe("BASE_URL");
  });
});

describe("EnvAutocompleteField", () => {
  it("inserts variable placeholders with keyboard", () => {
    useWorkspaceStore.getState().createEnvironment("Dev");
    const environment = useWorkspaceStore.getState().workspace.environments[0];
    useWorkspaceStore.getState().addEnvironmentVariable(environment.id);
    const variable =
      useWorkspaceStore.getState().workspace.environments[0].variables[0];
    useWorkspaceStore
      .getState()
      .updateEnvironmentVariable(environment.id, variable.id, {
        key: "BASE_URL",
        value: "https://api.example.com",
      });

    const Harness = () => {
      const [value, setValue] = React.useState("{{");
      return (
        <EnvAutocompleteField
          value={value}
          onValueChange={setValue}
          className="control-field h-9 rounded-xl px-3 py-2 text-sm text-foreground"
        />
      );
    };

    render(<Harness />);

    const input = screen.getByRole("textbox") as HTMLInputElement;
    fireEvent.click(input);
    fireEvent.keyDown(input, { key: "ArrowDown" });
    fireEvent.keyDown(input, { key: "Enter" });

    expect(input.value).toBe("{{BASE_URL}}");
  });
});
