import { ViewStyle } from "react-native";
import { ARPE_COLORS } from "./colors";

export const ADM_DARK = {
  bg: "#071d36",
  bgDeep: "#041120",
  surface: "#0c223e",
  surfaceTop: "#112b4d",
  surfaceBottom: "#0a1c34",
  surfaceRecessed: "#07162a",
  border: "rgba(148, 163, 184, 0.24)",
  borderControl: "rgba(148, 163, 184, 0.36)",
  borderHighlight: "rgba(255, 255, 255, 0.14)",
  accent: "#2563eb",
  secondarySeries: "#94a3b8",
  secondarySoft: "rgba(148, 163, 184, 0.16)",
  emerald: ARPE_COLORS.statusSanada,
  emeraldSoft: "rgba(16, 185, 129, 0.16)",
  danger: "#ef4444",
  dangerSoft: "rgba(239, 68, 68, 0.15)",
  textPrimary: "#f8fafc",
  textSecondary: "#cbd5e1",
  textMuted: "#8ea3bf",
} as const;

export const ADM_SHADOWS: Record<"card" | "cta" | "sheet", ViewStyle> = {
  card: {
    shadowColor: "#010712",
    shadowOpacity: 0.36,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  cta: {
    shadowColor: "#010712",
    shadowOpacity: 0.4,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  sheet: {
    shadowColor: "#000000",
    shadowOpacity: 0.55,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: -6 },
    elevation: 14,
  },
};
