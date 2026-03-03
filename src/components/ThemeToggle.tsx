import { Monitor, Moon, Sun } from "lucide-react";
import { ReactElement } from "react";
import { ThemeMode, useThemeStore } from "../store/useThemeStore";

const options: Array<{ value: ThemeMode; label: string; icon: typeof Sun }> = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: Monitor },
];

export const ThemeToggle = (): ReactElement => {
  const theme = useThemeStore((state) => state.theme);
  const setTheme = useThemeStore((state) => state.setTheme);

  return (
    <div className="flex items-center gap-1 rounded-md border border-border bg-card p-1">
      {options.map(({ value, label, icon: Icon }) => (
        <button
          key={value}
          type="button"
          title={label}
          aria-label={label}
          onClick={() => setTheme(value)}
          className={`rounded-sm p-1.5 transition-colors ${theme === value
            ? "bg-primary text-primary-foreground"
            : "text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
        >
          <Icon size={14} />
        </button>
      ))}
    </div>
  );
};
