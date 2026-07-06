// src/lib/theme.ts

// ==========================================
// 🎨 STYLES DES BOUTONS
// ==========================================

export const buttonStyles = {
  primary:
    "bg-emerald-600 hover:bg-emerald-700 text-white focus:ring-emerald-500 shadow-lg shadow-emerald-600/25 dark:bg-emerald-500 dark:hover:bg-emerald-600 dark:shadow-emerald-500/25",
  secondary:
    "bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 focus:ring-gray-400 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-gray-200 dark:border-slate-700 dark:focus:ring-gray-500",
  danger:
    "bg-red-600 hover:bg-red-700 text-white focus:ring-red-500 shadow-lg shadow-red-600/25 dark:bg-red-500 dark:hover:bg-red-600 dark:shadow-red-500/25",
};

// ==========================================
// 🌓 THÈME COMPLET (Clair + Sombre)
// ==========================================

export const theme = {
  // 🎨 Couleurs principales
  colors: {
    primary: {
      50: "#ecfdf5",
      100: "#d1fae5",
      200: "#a7f3d0",
      300: "#6ee7b7",
      400: "#34d399",
      500: "#10b981",
      600: "#059669",
      700: "#047857",
      800: "#065f46",
      900: "#064e3b",
    },
    secondary: {
      50: "#f8fafc",
      100: "#f1f5f9",
      200: "#e2e8f0",
      300: "#cbd5e1",
      400: "#94a3b8",
      500: "#64748b",
      600: "#475569",
      700: "#334155",
      800: "#1e293b",
      900: "#0f172a",
    },
    danger: {
      500: "#ef4444",
      600: "#dc2626",
      700: "#b91c1c",
    },
    // 🌙 Couleurs pour le mode sombre
    dark: {
      background: {
        primary: "#0f172a",
        secondary: "#1e293b",
        tertiary: "#334155",
      },
      text: {
        primary: "#f1f5f9",
        secondary: "#cbd5e1",
        muted: "#64748b",
      },
      border: "#334155",
      card: "#1e293b",
      input: "#0f172a",
    },
  },

  // 🎯 Variantes de boutons
  buttons: {
    primary: {
      background: "bg-emerald-600 dark:bg-emerald-500",
      hover: "hover:bg-emerald-700 dark:hover:bg-emerald-600",
      text: "text-white",
      ring: "focus:ring-emerald-500 dark:focus:ring-emerald-400",
      border: "",
      shadow: "shadow-lg shadow-emerald-600/25 dark:shadow-emerald-500/25",
    },
    secondary: {
      background: "bg-white dark:bg-slate-800",
      hover: "hover:bg-gray-50 dark:hover:bg-slate-700",
      text: "text-gray-700 dark:text-gray-200",
      border: "border border-gray-300 dark:border-slate-700",
      ring: "focus:ring-gray-400 dark:focus:ring-gray-500",
      shadow: "",
    },
    danger: {
      background: "bg-red-600 dark:bg-red-500",
      hover: "hover:bg-red-700 dark:hover:bg-red-600",
      text: "text-white",
      ring: "focus:ring-red-500 dark:focus:ring-red-400",
      border: "",
      shadow: "shadow-lg shadow-red-600/25 dark:shadow-red-500/25",
    },
  },

  // 📐 Espacements
  spacing: {
    xs: "0.25rem",
    sm: "0.5rem",
    md: "1rem",
    lg: "1.5rem",
    xl: "2rem",
    "2xl": "3rem",
  },

  // 🔤 Typographie
  typography: {
    fontFamily: {
      sans: "Inter, system-ui, -apple-system, sans-serif",
      mono: "JetBrains Mono, monospace",
    },
    fontSize: {
      xs: "0.75rem",
      sm: "0.875rem",
      base: "1rem",
      lg: "1.125rem",
      xl: "1.25rem",
      "2xl": "1.5rem",
      "3xl": "1.875rem",
    },
    fontWeight: {
      normal: "400",
      medium: "500",
      semibold: "600",
      bold: "700",
    },
  },

  // 🔲 Bordures
  borderRadius: {
    none: "0",
    sm: "0.125rem",
    DEFAULT: "0.25rem",
    md: "0.375rem",
    lg: "0.5rem",
    xl: "0.75rem",
    "2xl": "1rem",
    full: "9999px",
  },

  // 🌓 Ombres
  shadows: {
    sm: "0 1px 2px 0 rgb(0 0 0 / 0.05)",
    DEFAULT: "0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)",
    md: "0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)",
    lg: "0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)",
    xl: "0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)",
    "2xl": "0 25px 50px -12px rgb(0 0 0 / 0.25)",
  },

  // 📱 Breakpoints
  breakpoints: {
    sm: "640px",
    md: "768px",
    lg: "1024px",
    xl: "1280px",
    "2xl": "1536px",
  },
};

// ==========================================
// 🛠️ FONCTIONS UTILITAIRES
// ==========================================

/**
 * Récupère les classes CSS pour un bouton selon sa variante
 * @param variant - "primary" | "secondary" | "danger"
 * @returns string - Les classes CSS combinées
 */
export const getButtonClasses = (variant: keyof typeof theme.buttons) => {
  const btn = theme.buttons[variant];
  const classes = [
    btn.background,
    btn.hover,
    btn.text,
    btn.ring,
    btn.border,
    btn.shadow,
  ]
    .filter(Boolean)
    .join(" ");
  return classes;
};

/**
 * Récupère les couleurs du thème
 * @param isDark - boolean indiquant si le mode sombre est actif
 * @returns object - Les couleurs du thème
 */
export const getThemeColors = (isDark: boolean) => {
  return {
    background: isDark
      ? theme.colors.dark.background
      : {
          primary: "#ffffff",
          secondary: "#f8fafc",
          tertiary: "#f1f5f9",
        },
    text: isDark
      ? theme.colors.dark.text
      : {
          primary: "#0f172a",
          secondary: "#475569",
          muted: "#94a3b8",
        },
    border: isDark ? theme.colors.dark.border : "#e2e8f0",
    card: isDark ? theme.colors.dark.card : "#ffffff",
    input: isDark ? theme.colors.dark.input : "#ffffff",
  };
};

/**
 * Vérifie si le mode sombre est actif
 * @returns boolean - true si le mode sombre est actif
 */
export const isDarkMode = (): boolean => {
  if (typeof window === "undefined") return false;
  return document.documentElement.classList.contains("dark");
};

/**
 * Applique le thème (clair/sombre)
 * @param isDark - boolean pour activer/désactiver le mode sombre
 */
export const applyTheme = (isDark: boolean) => {
  if (typeof window === "undefined") return;
  if (isDark) {
    document.documentElement.classList.add("dark");
    localStorage.setItem("theme", "dark");
  } else {
    document.documentElement.classList.remove("dark");
    localStorage.setItem("theme", "light");
  }
};

/**
 * Bascule entre les thèmes (clair ↔ sombre)
 * @returns boolean - Le nouvel état du mode sombre
 */
export const toggleTheme = (): boolean => {
  const isDark = isDarkMode();
  applyTheme(!isDark);
  return !isDark;
};

/**
 * Initialise le thème au chargement de la page
 */
export const initTheme = () => {
  if (typeof window === "undefined") return;

  const savedTheme = localStorage.getItem("theme");
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;

  if (savedTheme === "dark" || (!savedTheme && prefersDark)) {
    document.documentElement.classList.add("dark");
  } else {
    document.documentElement.classList.remove("dark");
  }
};
