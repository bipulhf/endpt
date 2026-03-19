import { AlertTriangle, RefreshCw } from "lucide-react";
import React, { ReactNode } from "react";

interface AppErrorBoundaryProps {
  children: ReactNode;
}

interface AppErrorBoundaryState {
  hasError: boolean;
  message: string;
  stack: string;
  componentStack: string;
}

export class AppErrorBoundary extends React.Component<
  AppErrorBoundaryProps,
  AppErrorBoundaryState
> {
  constructor(props: AppErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, message: "", stack: "", componentStack: "" };
  }

  static getDerivedStateFromError(error: unknown): AppErrorBoundaryState {
    const message = error instanceof Error ? error.message : "Unknown rendering error";
    const stack = error instanceof Error ? error.stack ?? "" : "";
    return { hasError: true, message, stack, componentStack: "" };
  }

  componentDidCatch(error: unknown, errorInfo: React.ErrorInfo): void {
    this.setState({ componentStack: errorInfo.componentStack ?? "" });
    console.group("App rendering failed");
    console.error(error);
    if (errorInfo.componentStack) {
      console.error("Component stack:", errorInfo.componentStack);
    }
    console.groupEnd();
  }

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div className="relative h-[100dvh] w-full overflow-hidden bg-background text-foreground">
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute left-[-7rem] top-[-6rem] h-72 w-72 rounded-full bg-primary/20 blur-3xl" />
            <div className="absolute right-[-4rem] top-10 h-64 w-64 rounded-full bg-cyan-400/10 blur-3xl" />
            <div className="absolute bottom-[-8rem] left-1/3 h-80 w-80 rounded-full bg-amber-300/10 blur-3xl" />
          </div>

          <div className="relative flex h-full w-full items-center justify-center px-4">
            <div className="panel-surface w-full max-w-lg rounded-[1.5rem] px-6 py-8 text-center sm:px-8 sm:py-10">
              <AlertTriangle className="mx-auto text-rose-400" size={28} />
              <h1 className="mt-3 text-2xl font-semibold tracking-tight text-foreground">
                UI Failed To Render
              </h1>
              <p className="mt-2 text-sm text-muted-foreground">
                {this.state.message || "An unexpected UI error occurred."}
              </p>
              {this.state.stack && (
                <pre className="mt-4 max-h-44 overflow-auto rounded-xl border border-border/70 bg-background/40 p-3 text-left text-xs text-muted-foreground">
                  {this.state.stack}
                </pre>
              )}
              {this.state.componentStack && (
                <pre className="mt-3 max-h-44 overflow-auto rounded-xl border border-border/70 bg-background/40 p-3 text-left text-xs text-muted-foreground">
                  {this.state.componentStack}
                </pre>
              )}
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="mt-6 inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
              >
                <RefreshCw size={14} />
                Reload App
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
