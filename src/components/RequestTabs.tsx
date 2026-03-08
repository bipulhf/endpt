import { X } from "lucide-react";
import { ReactElement } from "react";

interface TabItem {
  id: string;
  name: string;
  method: string;
}

interface RequestTabsProps {
  tabs: TabItem[];
  activeRequestId: string | null;
  onSelect: (id: string) => void;
  onClose: (id: string) => void;
}

export const RequestTabs = ({
  tabs,
  activeRequestId,
  onSelect,
  onClose,
}: RequestTabsProps): ReactElement | null => {
  if (tabs.length === 0) {
    return null;
  }

  return (
    <div className="mb-1.5 flex gap-1.5 overflow-x-auto pb-1">
      {tabs.map((tab) => (
        <div
          key={tab.id}
          className={`group inline-flex items-center gap-1.5 rounded-xl border px-2.5 py-1.5 text-xs transition-all ${
            tab.id === activeRequestId
              ? "border-primary/30 bg-primary/10 text-primary"
              : "border-border/70 bg-background/50 text-muted-foreground hover:border-primary/20 hover:bg-accent/30 hover:text-foreground"
          }`}
        >
          <button
            type="button"
            onClick={() => onSelect(tab.id)}
            className="inline-flex items-center gap-2"
          >
            <span className="rounded-full border border-border/60 bg-background/70 px-1.5 py-0.5 text-[10px] font-semibold text-foreground">
              {tab.method}
            </span>
            <span className="max-w-[140px] truncate">{tab.name}</span>
          </button>
          <button
            type="button"
            onClick={() => onClose(tab.id)}
            className="rounded-full p-1 transition-colors hover:bg-accent/50 hover:text-foreground"
            aria-label="Close tab"
          >
            <X size={12} />
          </button>
        </div>
      ))}
    </div>
  );
};
