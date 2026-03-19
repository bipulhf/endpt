import {
  Boxes,
  Braces,
  CheckCheck,
  FolderTree,
  PanelsTopLeft,
  Save,
  SquareTerminal,
} from "lucide-react";
import { ReactElement, useMemo } from "react";
import { useWorkspaceStore } from "../store/useWorkspaceStore";
import { ThemeToggle } from "./ThemeToggle";
import { UpdateChecker } from "./UpdateChecker";
import { Button } from "./ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";

interface AppTopbarProps {
  mobileView: "workspace" | "editor" | "response";
  onChangeMobileView: (value: "workspace" | "editor" | "response") => void;
  onOpenEnvironmentManager: () => void;
  onSave: () => void;
  saved: boolean;
}

export const AppTopbar = ({
  mobileView,
  onChangeMobileView,
  onOpenEnvironmentManager,
  onSave,
  saved,
}: AppTopbarProps): ReactElement => {
  const workspace = useWorkspaceStore((state) => state.workspace);
  const setActiveEnvironment = useWorkspaceStore(
    (state) => state.setActiveEnvironment,
  );

  const stats = useMemo(() => {
    const folderCount = workspace.folders.length;
    const requestCount = workspace.folders.reduce(
      (count, folder) => count + folder.requests.length,
      0,
    );
    const activeEnvironment = workspace.environments.find(
      (environment) => environment.id === workspace.activeEnvironmentId,
    );

    return {
      folderCount,
      requestCount,
      activeEnvironmentName: activeEnvironment?.name ?? "No Environment",
      envCount: workspace.environments.length,
    };
  }, [workspace]);

  return (
    <header className="relative shrink-0 border-b border-border/70 bg-gradient-to-r from-card/95 via-card/85 to-background/90 px-2.5 py-2.5 sm:px-4 sm:py-3">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_12%_10%,rgba(251,146,60,0.15),transparent_45%),radial-gradient(circle_at_88%_20%,rgba(56,189,248,0.15),transparent_38%)]" />
      <div className="relative flex items-center justify-between gap-2.5">
        <div className="flex min-w-0 items-center gap-2.5">
          <div className="relative flex h-10 w-10 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 shadow-lg shadow-primary/10">
            <img src="/icon.png" alt="Endpt" className="h-6 w-6" />
          </div>
          <div className="min-w-0">
            <p className="eyebrow">Endpt</p>
            <h1 className="truncate text-base font-semibold tracking-tight text-foreground sm:text-lg">
              API Workbench
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <div className="hidden lg:block">
            <Select
              value={workspace.activeEnvironmentId ?? "__none__"}
              onValueChange={(value) =>
                setActiveEnvironment(value === "__none__" ? null : value)
              }
            >
              <SelectTrigger className="h-9 w-[12rem] text-xs">
                <SelectValue placeholder="No Environment" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">No Environment</SelectItem>
                {workspace.environments.map((environment) => (
                  <SelectItem key={environment.id} value={environment.id}>
                    {environment.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={onOpenEnvironmentManager}
            className="h-9 px-2.5 sm:px-3"
          >
            <Braces size={14} />
            <span className="hidden sm:inline">Environments</span>
            <span className="sm:hidden">Env</span>
          </Button>

          <Button
            variant="secondary"
            size="sm"
            onClick={onSave}
            className="h-9 px-2.5 sm:px-3"
          >
            <Save size={14} />
            <span className="hidden sm:inline">Save</span>
          </Button>

          <span
            className={`hidden items-center gap-1 rounded-full border border-emerald-600/25 bg-emerald-600/10 px-2 py-1 text-[11px] font-medium text-emerald-700 transition-all duration-300 sm:inline-flex dark:border-emerald-400/25 dark:bg-emerald-400/10 dark:text-emerald-300 ${
              saved ? "opacity-100" : "pointer-events-none opacity-0"
            }`}
          >
            <CheckCheck size={12} />
            Saved
          </span>

          <div className="hidden md:flex">
            <UpdateChecker />
          </div>
          <ThemeToggle />
        </div>
      </div>

      <div className="relative mt-2.5 flex items-center gap-1.5 lg:hidden">
        <Select
          value={workspace.activeEnvironmentId ?? "__none__"}
          onValueChange={(value) =>
            setActiveEnvironment(value === "__none__" ? null : value)
          }
        >
          <SelectTrigger className="h-9 max-w-[11rem] text-xs">
            <SelectValue placeholder="No Environment" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__none__">No Environment</SelectItem>
            {workspace.environments.map((environment) => (
              <SelectItem key={environment.id} value={environment.id}>
                {environment.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="metric-card inline-flex min-w-0 items-center gap-1 rounded-xl px-2 py-1 text-[11px] text-muted-foreground">
          <Braces size={12} />
          <span className="truncate">{stats.activeEnvironmentName}</span>
        </div>
      </div>

      <div className="relative mt-1.5 grid grid-cols-3 gap-1.5 lg:hidden">
        <button
          type="button"
          onClick={() => onChangeMobileView("workspace")}
          className={`inline-flex min-h-[2.8rem] items-center justify-center gap-1 rounded-xl border px-2 py-2 text-[11px] font-medium transition-all sm:text-xs ${
            mobileView === "workspace"
              ? "border-primary/30 bg-primary/10 text-primary shadow-lg shadow-primary/10"
              : "border-border/70 bg-background/55 text-muted-foreground hover:bg-accent/30 hover:text-foreground"
          }`}
        >
          <FolderTree size={13} />
          Collections
        </button>
        <button
          type="button"
          onClick={() => onChangeMobileView("editor")}
          className={`inline-flex min-h-[2.8rem] items-center justify-center gap-1 rounded-xl border px-2 py-2 text-[11px] font-medium transition-all sm:text-xs ${
            mobileView === "editor"
              ? "border-primary/30 bg-primary/10 text-primary shadow-lg shadow-primary/10"
              : "border-border/70 bg-background/55 text-muted-foreground hover:bg-accent/30 hover:text-foreground"
          }`}
        >
          <SquareTerminal size={13} />
          Editor
        </button>
        <button
          type="button"
          onClick={() => onChangeMobileView("response")}
          className={`inline-flex min-h-[2.8rem] items-center justify-center gap-1 rounded-xl border px-2 py-2 text-[11px] font-medium transition-all sm:text-xs ${
            mobileView === "response"
              ? "border-primary/30 bg-primary/10 text-primary shadow-lg shadow-primary/10"
              : "border-border/70 bg-background/55 text-muted-foreground hover:bg-accent/30 hover:text-foreground"
          }`}
        >
          <PanelsTopLeft size={13} />
          Response
        </button>
      </div>
    </header>
  );
};
