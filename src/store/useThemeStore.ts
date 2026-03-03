import { create } from "zustand";

export type ThemeMode = "light" | "dark" | "system";

interface ThemeStore {
  theme: ThemeMode;
  setTheme: (theme: ThemeMode) => void;
  applyTheme: () => void;
}

const STORAGE_KEY = "postman-lite-theme";

const getSystemTheme = (): "light" | "dark" => {
  if (typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches) {
    return "dark";
  }
  return "light";
};

const resolveTheme = (theme: ThemeMode): "light" | "dark" => {
  if (theme === "system") {
    return getSystemTheme();
  }
  return theme;
};

const getInitialTheme = (): ThemeMode => {
  if (typeof window === "undefined") {
    return "system";
  }

  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (stored === "light" || stored === "dark" || stored === "system") {
    return stored;
  }

  return "system";
};

export const useThemeStore = create<ThemeStore>((set, get) => ({
  theme: getInitialTheme(),
  setTheme: (theme) => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, theme);
    }
    set({ theme });
    get().applyTheme();
  },
  applyTheme: () => {
    if (typeof document === "undefined") {
      return;
    }
    const root = document.documentElement;
    root.classList.remove("light", "dark");
    root.classList.add(resolveTheme(get().theme));
  },
}));
