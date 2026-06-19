"use client";

import { useState, useEffect } from "react";
import { Moon, Sun, Laptop } from "lucide-react";
import Button from "./Button";

type Theme = "light" | "dark" | "system";

export default function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("system");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const savedTheme = localStorage.getItem("theme") as Theme | null;
    if (savedTheme) {
      setTheme(savedTheme);
      applyTheme(savedTheme);
    } else {
      applyTheme("system");
    }
  }, []);

  const applyTheme = (newTheme: Theme) => {
    const isDark =
      newTheme === "dark" ||
      (newTheme === "system" &&
        window.matchMedia("(prefers-color-scheme: dark)").matches);

    if (isDark) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  };

  const toggleTheme = () => {
    const themes: Theme[] = ["light", "dark", "system"];
    const currentIndex = themes.indexOf(theme);
    const nextIndex = (currentIndex + 1) % themes.length;
    const newTheme = themes[nextIndex];

    setTheme(newTheme);
    localStorage.setItem("theme", newTheme);
    applyTheme(newTheme);
  };

  const getIcon = () => {
    if (theme === "light") return <Sun size={18} />;
    if (theme === "dark") return <Moon size={18} />;
    return <Laptop size={18} />;
  };

  const getLabel = () => {
    if (theme === "light") return "Clair";
    if (theme === "dark") return "Sombre";
    return "Auto";
  };

  if (!mounted) return null;

  return (
    <Button
      onClick={toggleTheme}
      variant="secondary"
      className="p-2 rounded-full flex items-center gap-2"
      icon={getIcon()}
    >
      <span className="text-xs font-medium hidden sm:inline">{getLabel()}</span>
    </Button>
  );
}
