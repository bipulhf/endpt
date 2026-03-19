import {
  Check,
  Plus,
  Shield,
  ShieldOff,
  Trash2,
  X,
} from "lucide-react";
import { ReactElement, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { ENV_KEY_PATTERN } from "../store/defaults";
import { useWorkspaceStore } from "../store/useWorkspaceStore";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { EnvAutocompleteField } from "./EnvAutocompleteField";

interface EnvironmentManagerProps {
  open: boolean;
  onClose: () => void;
}

export const EnvironmentManager = ({
  open,
  onClose,
}: EnvironmentManagerProps): ReactElement | null => {
  const workspace = useWorkspaceStore((state) => state.workspace);
  const createEnvironment = useWorkspaceStore((state) => state.createEnvironment);
  const renameEnvironment = useWorkspaceStore((state) => state.renameEnvironment);
  const deleteEnvironment = useWorkspaceStore((state) => state.deleteEnvironment);
  const setActiveEnvironment = useWorkspaceStore((state) => state.setActiveEnvironment);
  const addEnvironmentVariable = useWorkspaceStore(
    (state) => state.addEnvironmentVariable,
  );
  const updateEnvironmentVariable = useWorkspaceStore(
    (state) => state.updateEnvironmentVariable,
  );
  const deleteEnvironmentVariable = useWorkspaceStore(
    (state) => state.deleteEnvironmentVariable,
  );

  const [selectedEnvironmentId, setSelectedEnvironmentId] = useState<string | null>(null);
  const [newEnvironmentName, setNewEnvironmentName] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) {
      return;
    }

    const environmentExists = workspace.environments.some(
      (environment) => environment.id === selectedEnvironmentId,
    );

    if (!environmentExists) {
      setSelectedEnvironmentId(
        workspace.activeEnvironmentId ?? workspace.environments[0]?.id ?? null,
      );
    }
  }, [open, workspace.environments, workspace.activeEnvironmentId, selectedEnvironmentId]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  const selectedEnvironment = useMemo(
    () =>
      workspace.environments.find(
        (environment) => environment.id === selectedEnvironmentId,
      ) ?? null,
    [workspace.environments, selectedEnvironmentId],
  );

  if (!open) {
    return null;
  }

  const handleCreateEnvironment = (): void => {
    createEnvironment(newEnvironmentName);
    const environments = useWorkspaceStore.getState().workspace.environments;
    const latest = environments[environments.length - 1];
    if (latest) {
      setSelectedEnvironmentId(latest.id);
      setError("");
      setNewEnvironmentName("");
    }
  };

  const handleUpdateVariable = (
    variableId: string,
    key: "key" | "value" | "isSecret",
    value: string | boolean,
  ): void => {
    if (!selectedEnvironment) {
      return;
    }

    const result = updateEnvironmentVariable(selectedEnvironment.id, variableId, {
      [key]: value,
    });

    if (!result.ok) {
      const message = result.error ?? "Failed to update variable";
      setError(message);
      toast.error(message);
      return;
    }

    setError("");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-3 backdrop-blur-sm sm:p-6">
      <div className="panel-surface-strong flex h-[min(44rem,95dvh)] w-full max-w-6xl min-w-0 flex-col overflow-hidden rounded-[1.3rem] border border-border/70">
        <div className="flex items-center justify-between border-b border-border/70 px-4 py-3 sm:px-6">
          <div>
            <p className="eyebrow">Environment Manager</p>
            <h3 className="mt-1 text-lg font-semibold tracking-tight text-foreground">
              Define workspace variables and switch contexts fast
            </h3>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close">
            <X size={16} />
          </Button>
        </div>

        <div className="grid min-h-0 flex-1 grid-cols-1 gap-0 md:grid-cols-[250px_minmax(0,1fr)]">
          <aside className="border-b border-border/70 p-3 md:border-b-0 md:border-r">
            <div className="space-y-2">
              {workspace.environments.map((environment) => (
                <button
                  key={environment.id}
                  type="button"
                  onClick={() => setSelectedEnvironmentId(environment.id)}
                  className={`flex w-full items-center justify-between rounded-xl border px-3 py-2 text-left text-sm transition-colors ${
                    selectedEnvironmentId === environment.id
                      ? "border-primary/30 bg-primary/10 text-primary"
                      : "border-border/60 bg-background/40 text-foreground hover:bg-accent/30"
                  }`}
                >
                  <span className="truncate">{environment.name}</span>
                  {workspace.activeEnvironmentId === environment.id && (
                    <Check size={14} />
                  )}
                </button>
              ))}

              {workspace.environments.length === 0 && (
                <p className="rounded-xl border border-dashed border-border/70 px-3 py-4 text-xs text-muted-foreground">
                  No environments yet.
                </p>
              )}
            </div>

            <div className="mt-3 flex gap-1.5">
              <Input
                value={newEnvironmentName}
                onChange={(event) => setNewEnvironmentName(event.target.value)}
                placeholder="New environment"
                className="h-9"
              />
              <Button
                size="icon"
                onClick={handleCreateEnvironment}
                aria-label="Create environment"
              >
                <Plus size={15} />
              </Button>
            </div>
          </aside>

          <section className="min-h-0 overflow-y-auto p-3 sm:p-5">
            {!selectedEnvironment ? (
              <div className="panel-subtle rounded-[1rem] px-4 py-10 text-center">
                <p className="text-sm text-muted-foreground">
                  Select an environment to edit variables.
                </p>
              </div>
            ) : (
              <>
                <div className="mb-3 flex flex-wrap items-center gap-2.5">
                  <Input
                    value={selectedEnvironment.name}
                    onChange={(event) =>
                      renameEnvironment(selectedEnvironment.id, event.target.value)
                    }
                    className="h-9 max-w-xs"
                    placeholder="Environment name"
                  />
                  <Button
                    variant={
                      workspace.activeEnvironmentId === selectedEnvironment.id
                        ? "default"
                        : "secondary"
                    }
                    size="sm"
                    onClick={() => setActiveEnvironment(selectedEnvironment.id)}
                  >
                    {workspace.activeEnvironmentId === selectedEnvironment.id
                      ? "Active"
                      : "Set Active"}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      deleteEnvironment(selectedEnvironment.id);
                      setError("");
                    }}
                  >
                    <Trash2 size={14} />
                    Delete
                  </Button>
                </div>

                <div className="mb-2 grid grid-cols-[minmax(8rem,1fr)_minmax(8rem,1fr)_72px_42px] gap-2 text-[11px] font-medium uppercase tracking-[0.15em] text-muted-foreground">
                  <span>Key</span>
                  <span>Value</span>
                  <span>Secret</span>
                  <span />
                </div>

                <div className="space-y-2">
                  {selectedEnvironment.variables.map((variable) => {
                    const isInvalidKey =
                      variable.key.trim().length > 0 &&
                      !ENV_KEY_PATTERN.test(variable.key.trim());

                    return (
                      <div
                        key={variable.id}
                        className="grid grid-cols-[minmax(8rem,1fr)_minmax(8rem,1fr)_72px_42px] items-center gap-2"
                      >
                        <Input
                          value={variable.key}
                          onChange={(event) =>
                            handleUpdateVariable(
                              variable.id,
                              "key",
                              event.target.value,
                            )
                          }
                          placeholder="API_BASE_URL"
                          className={`h-9 ${isInvalidKey ? "border-rose-400/70" : ""}`}
                        />
                        <EnvAutocompleteField
                          value={variable.value}
                          onValueChange={(value) =>
                            handleUpdateVariable(variable.id, "value", value)
                          }
                          placeholder="Variable value"
                          className="control-field h-9 rounded-xl px-3 py-2 text-sm text-foreground"
                        />
                        <button
                          type="button"
                          onClick={() =>
                            handleUpdateVariable(
                              variable.id,
                              "isSecret",
                              !variable.isSecret,
                            )
                          }
                          className={`inline-flex h-9 items-center justify-center rounded-xl border transition-colors ${
                            variable.isSecret
                              ? "border-amber-400/30 bg-amber-400/10 text-amber-300"
                              : "border-border/70 bg-background/40 text-muted-foreground hover:bg-accent/30"
                          }`}
                          aria-label="Toggle secret"
                        >
                          {variable.isSecret ? (
                            <Shield size={14} />
                          ) : (
                            <ShieldOff size={14} />
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            deleteEnvironmentVariable(
                              selectedEnvironment.id,
                              variable.id,
                            )
                          }
                          className="inline-flex h-9 items-center justify-center rounded-xl border border-input/70 bg-background/40 text-muted-foreground transition-colors hover:bg-rose-500/10 hover:text-rose-300"
                          aria-label="Delete variable"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    );
                  })}
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <Button
                    size="sm"
                    onClick={() => addEnvironmentVariable(selectedEnvironment.id)}
                  >
                    <Plus size={14} />
                    Add Variable
                  </Button>
                  <p className="text-xs text-muted-foreground">
                    Variable key format: <code>[A-Za-z_][A-Za-z0-9_]*</code>
                  </p>
                </div>
              </>
            )}
          </section>
        </div>

        {error && (
          <div className="border-t border-border/70 px-4 py-2 text-xs text-rose-300">
            {error}
          </div>
        )}
      </div>
    </div>
  );
};
