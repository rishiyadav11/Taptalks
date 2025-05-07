// store/useThemeStore.ts
import { create } from "zustand";

// Define themes as a constant tuple and extract the Theme type
export const THEMES = ["coffee", "dark", "light"] as const;
export type Theme = typeof THEMES[number];

// Type guard to validate stored theme
const isValidTheme = (value: string | null): value is Theme => {
  return THEMES.includes(value as Theme);
};

// Define the store interface
interface ThemeStore {
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

// Zustand store with safe localStorage retrieval
export const useThemeStore = create<ThemeStore>((set) => {
  const stored = localStorage.getItem("chat-theme");
  const initialTheme: Theme = isValidTheme(stored) ? stored : "coffee";

  return {
    theme: initialTheme,
    setTheme: (theme: Theme) => {
      localStorage.setItem("chat-theme", theme);
      set({ theme });
    },
  };
});
