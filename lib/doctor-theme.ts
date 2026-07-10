/** Doctor workspace palette — scoped to /doctor routes only */
export const doctorTheme = {
  primary: {
    DEFAULT: "teal-600",
    light: "teal-50",
    medium: "teal-100",
    dark: "teal-700",
    ring: "teal-500",
  },
  secondary: {
    DEFAULT: "blue-600",
    light: "blue-50",
    medium: "blue-100",
  },
  neutral: {
    white: "white",
    bg: "gray-50",
    border: "gray-200",
    text: "gray-700",
    muted: "gray-500",
  },
  alert: "red-600",
  success: "green-600",
} as const;
