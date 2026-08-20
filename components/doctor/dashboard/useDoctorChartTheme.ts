"use client";

import { useTheme } from "next-themes";

export function useDoctorChartTheme() {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  return {
    isDark,
    grid: isDark ? "rgba(148, 163, 184, 0.15)" : "rgba(148, 163, 184, 0.35)",
    axis: isDark ? "#94a3b8" : "#64748b",
    tooltipBg: isDark ? "#1e293b" : "#ffffff",
    tooltipBorder: isDark ? "rgba(148, 163, 184, 0.2)" : "rgba(15, 23, 42, 0.08)",
    tooltipText: isDark ? "#f8fafc" : "#0f172a",
    donutEmpty: isDark ? "#334155" : "#e2e8f0",
    colors: {
      indigo: "#6366f1",
      blue: "#3b82f6",
      violet: "#8b5cf6",
      pink: "#ec4899",
      slate: isDark ? "#475569" : "#94a3b8",
      green: "#22c55e",
      orange: "#f97316",
      red: "#ef4444",
    },
  };
}
