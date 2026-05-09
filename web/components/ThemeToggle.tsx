"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";

type ThemeMode = "light" | "dark";

const STORAGE_KEY = "theme";

function applyTheme(theme: ThemeMode) {
  const isDark = theme === "dark";
  document.documentElement.classList.toggle("dark", isDark);
  document.documentElement.style.colorScheme = isDark ? "dark" : "light";
  window.localStorage.setItem(STORAGE_KEY, theme);
}

export default function ThemeToggle({
  className,
}: {
  className?: string;
}) {
  const [mounted, setMounted] = useState(false);
  const [theme, setTheme] = useState<ThemeMode>("light");

  useEffect(() => {
    const frameId = window.requestAnimationFrame(() => {
      const isDark = document.documentElement.classList.contains("dark");
      setTheme(isDark ? "dark" : "light");
      setMounted(true);
    });

    return () => window.cancelAnimationFrame(frameId);
  }, []);

  function handleToggle() {
    const nextTheme: ThemeMode = theme === "dark" ? "light" : "dark";
    applyTheme(nextTheme);
    setTheme(nextTheme);
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="icon"
      className={`cursor-pointer ${className ?? ""}`}
      onClick={handleToggle}
      aria-label={mounted && theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
      title={mounted && theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
    >
      {mounted && theme === "dark" ? (
        <Sun className="h-4 w-4" />
      ) : (
        <Moon className="h-4 w-4" />
      )}
    </Button>
  );
}
