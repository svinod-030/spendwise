import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { colorScheme } from "nativewind";

export type AppTheme = "light" | "dark" | "system";

interface ThemeState {
  theme: AppTheme;
  setTheme: (theme: AppTheme) => void;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      theme: "system", // Default to system theme
      setTheme: (theme: AppTheme) => {
        set({ theme });
        // Apply to NativeWind
        if (theme === "system") {
          colorScheme.set("system");
        } else {
          colorScheme.set(theme);
        }
      },
    }),
    {
      name: "spendwise-theme",
      storage: createJSONStorage(() => AsyncStorage),
      onRehydrateStorage: () => (state) => {
        // Apply theme on load
        if (state) {
          if (state.theme === "system") {
            colorScheme.set("system");
          } else {
            colorScheme.set(state.theme);
          }
        }
      },
    }
  )
);
