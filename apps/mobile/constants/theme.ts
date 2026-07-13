// Theme constants matching the web app's design system
export const Colors = {
  primary: {
    50: "#F5F3FF",
    100: "#EDE9FE",
    200: "#DDD6FE",
    300: "#C4B5FD",
    400: "#A78BFA",
    500: "#7C3AED",
    600: "#6D28D9",
    700: "#5B21B6",
    800: "#4C1D95",
    900: "#3B0764",
  },
  accent: {
    50: "#ECFEFF",
    100: "#CFFAFE",
    200: "#A5F3FC",
    300: "#67E8F9",
    400: "#22D3EE",
    500: "#06B6D4",
    600: "#0891B2",
    700: "#0E7490",
  },
  sakura: {
    50: "#FDF2F8",
    100: "#FCE7F3",
    300: "#F9A8D4",
    400: "#F472B6",
    500: "#EC4899",
    600: "#DB2777",
  },
  gold: {
    50: "#FFFBEB",
    100: "#FEF3C7",
    300: "#FCD34D",
    400: "#FBBF24",
    500: "#F59E0B",
    600: "#D97706",
  },
  dark: {
    bg: "#0F0B1E",
    card: "#1A1433",
    cardAlt: "#1E1840",
    surface: "#241E3A",
    border: "#2D2650",
    borderLight: "#3D3570",
    text: "#FFFFFF",
    textSecondary: "#A0A0B8",
    textMuted: "#6B6B85",
  },
  light: {
    bg: "#FAFAFA",
    card: "#FFFFFF",
    cardAlt: "#F8F7FF",
    surface: "#F0EDF8",
    border: "#E5E7EB",
    borderLight: "#D1D5DB",
    text: "#111827",
    textSecondary: "#6B7280",
    textMuted: "#9CA3AF",
  },
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  "2xl": 24,
  "3xl": 32,
  "4xl": 40,
  "5xl": 48,
};

export const BorderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  "2xl": 24,
  "3xl": 32,
  full: 9999,
};

export const FontSize = {
  xs: 11,
  sm: 13,
  base: 15,
  lg: 17,
  xl: 20,
  "2xl": 24,
  "3xl": 30,
  "4xl": 36,
};

export const FontWeight = {
  normal: "400" as const,
  medium: "500" as const,
  semibold: "600" as const,
  bold: "700" as const,
  extrabold: "800" as const,
  black: "900" as const,
};
