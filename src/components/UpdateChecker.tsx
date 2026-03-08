import { check, type Update } from "@tauri-apps/plugin-updater";
import { relaunch } from "@tauri-apps/plugin-process";
import { Download, Loader2, RefreshCw } from "lucide-react";
import { ReactElement, useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "./ui/button";

type UpdateStatus =
  | "idle"
  | "checking"
  | "available"
  | "downloading"
  | "ready"
  | "up-to-date"
  | "error";

export const UpdateChecker = (): ReactElement => {
  const [status, setStatus] = useState<UpdateStatus>("idle");
  const [pendingUpdate, setPendingUpdate] = useState<Update | null>(null);
  const [progress, setProgress] = useState<string>("");

  const checkForUpdate = useCallback(async (silent = false) => {
    setStatus("checking");
    try {
      const update = await check();
      if (update) {
        setPendingUpdate(update);
        setStatus("available");
        toast.info(`Update ${update.version} available`);
      } else {
        setStatus("up-to-date");
        if (!silent) toast.success("You're on the latest version");
        setTimeout(() => setStatus("idle"), 3000);
      }
    } catch (err) {
      setStatus("error");
      if (!silent) {
        const msg = err instanceof Error ? err.message : "Update check failed";
        toast.error(msg);
      }
      setTimeout(() => setStatus("idle"), 3000);
    }
  }, []);

  const downloadAndInstall = useCallback(async () => {
    if (!pendingUpdate) return;
    setStatus("downloading");
    try {
      let totalLen = 0;
      let downloaded = 0;
      await pendingUpdate.downloadAndInstall((event) => {
        switch (event.event) {
          case "Started":
            totalLen = event.data.contentLength ?? 0;
            setProgress("0%");
            break;
          case "Progress":
            downloaded += event.data.chunkLength;
            if (totalLen > 0) {
              setProgress(`${Math.round((downloaded / totalLen) * 100)}%`);
            }
            break;
          case "Finished":
            setProgress("");
            break;
        }
      });
      setStatus("ready");
      toast.success("Update installed — restart to apply", {
        action: {
          label: "Restart now",
          onClick: () => void relaunch(),
        },
        duration: 15000,
      });
    } catch (err) {
      setStatus("error");
      const msg = err instanceof Error ? err.message : "Download failed";
      toast.error(msg);
      setTimeout(() => setStatus("idle"), 3000);
    }
  }, [pendingUpdate]);

  // Auto-check on mount (silent)
  useEffect(() => {
    const timer = setTimeout(() => void checkForUpdate(true), 3000);
    return () => clearTimeout(timer);
  }, [checkForUpdate]);

  if (status === "available" && pendingUpdate) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={() => void downloadAndInstall()}
        className="gap-1.5 border-emerald-600/30 text-emerald-700 hover:bg-emerald-600/10 hover:text-emerald-800 dark:border-emerald-400/30 dark:text-emerald-400 dark:hover:bg-emerald-400/10 dark:hover:text-emerald-200"
      >
        <Download size={13} />
        Update to {pendingUpdate.version}
      </Button>
    );
  }

  if (status === "downloading") {
    return (
      <Button variant="outline" size="sm" disabled className="gap-1.5">
        <Loader2 size={13} className="animate-spin" />
        {progress || "Installing..."}
      </Button>
    );
  }

  if (status === "ready") {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={() => void relaunch()}
        className="gap-1.5 border-emerald-600/30 text-emerald-700 hover:bg-emerald-600/10 hover:text-emerald-800 dark:border-emerald-400/30 dark:text-emerald-400 dark:hover:bg-emerald-400/10 dark:hover:text-emerald-200"
      >
        <RefreshCw size={13} />
        Restart
      </Button>
    );
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => void checkForUpdate(false)}
      disabled={status === "checking"}
      className="gap-1.5"
      title="Check for updates"
    >
      {status === "checking" ? (
        <Loader2 size={13} className="animate-spin" />
      ) : (
        <RefreshCw size={13} />
      )}
      {status === "checking"
        ? "Checking..."
        : status === "up-to-date"
          ? "Up to date"
          : "Updates"}
    </Button>
  );
};
