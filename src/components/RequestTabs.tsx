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

export const RequestTabs = ({ tabs, activeRequestId, onSelect, onClose }: RequestTabsProps): ReactElement | null => {
  if (tabs.length === 0) {
    return null;
  }

  return (
    <div className="mb-3 flex gap-2 overflow-x-auto pb-1">
      {tabs.map((tab) => (
        <div
          key={tab.id}
          className={`group inline-flex items-center gap-2 rounded border px-2 py-1 text-xs ${tab.id === activeRequestId
            ? "border-primary bg-primary/10 text-primary"
            : "border-border bg-card text-muted-foreground"
            }`}
        >
          <button
            type="button"
            onClick={() => onSelect(tab.id)}
            className="inline-flex items-center gap-2"
          >
            <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-semibold text-foreground">
              {tab.method}
            </span>
            <span className="max-w-[140px] truncate">{tab.name}</span>
          </button>
          <button
            type="button"
            onClick={() => onClose(tab.id)}
            className="rounded p-0.5 hover:bg-muted"
            aria-label="Close tab"
          >
            <X size={12} />
          </button>
        </div>
      ))}
    </div>
  );
};
