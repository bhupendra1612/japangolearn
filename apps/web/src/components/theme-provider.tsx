"use client";

import React, { createContext, useContext } from "react";

// Forcing dark theme permanently
type Theme = "dark";
const ThemeCtx = createContext<{ theme: Theme; setTheme: (t: Theme) => void }>({
  theme: "dark",
  setTheme: () => {},
});

export function useTheme() {
  return useContext(ThemeCtx);
}

/**
 * Stripped down ThemeProvider since the app now uses a fixed Dark Neon UI.
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <ThemeCtx.Provider value={{ theme: "dark", setTheme: () => {} }}>{children}</ThemeCtx.Provider>
  );
}
