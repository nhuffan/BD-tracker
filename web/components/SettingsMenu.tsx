"use client";

import { useEffect, useState } from "react";
import { Languages, Moon, Settings, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useI18n } from "@/lib/i18n/I18nProvider";
import type { Locale } from "@/lib/i18n/translations";

type ThemeMode = "light" | "dark";

const THEME_STORAGE_KEY = "theme";

function applyTheme(theme: ThemeMode) {
  const isDark = theme === "dark";
  document.documentElement.classList.toggle("dark", isDark);
  document.documentElement.style.colorScheme = isDark ? "dark" : "light";
  window.localStorage.setItem(THEME_STORAGE_KEY, theme);
}

export default function SettingsMenu({ className = "" }: { className?: string }) {
  const { locale, setLocale, t } = useI18n();
  const [theme, setTheme] = useState<ThemeMode>("light");

  useEffect(() => {
    const frameId = window.requestAnimationFrame(() => {
      setTheme(document.documentElement.classList.contains("dark") ? "dark" : "light");
    });
    return () => window.cancelAnimationFrame(frameId);
  }, []);

  function changeTheme(value: string) {
    if (value !== "light" && value !== "dark") return;
    setTheme(value);
    applyTheme(value);
  }

  function changeLocale(value: string) {
    if (value === "en" || value === "vi" || value === "zh-CN") setLocale(value as Locale);
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="icon"
          className={`cursor-pointer ${className}`}
          aria-label={t("Settings")}
          title={t("Settings")}
        >
          <Settings className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-56 p-1.5">
        <DropdownMenuLabel className="flex items-center gap-2 px-2 py-2">
          <Languages className="h-4 w-4 text-muted-foreground" />
          {t("Language")}
        </DropdownMenuLabel>
        <DropdownMenuRadioGroup value={locale} onValueChange={changeLocale}>
          <DropdownMenuRadioItem value="en" className="cursor-pointer py-2">
            English
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="vi" className="cursor-pointer py-2">
            Tiếng Việt
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="zh-CN" className="cursor-pointer py-2">
            中文（简体）
          </DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>

        <DropdownMenuSeparator />

        <DropdownMenuLabel className="px-2 py-2">{t("Appearance")}</DropdownMenuLabel>
        <DropdownMenuRadioGroup value={theme} onValueChange={changeTheme}>
          <DropdownMenuRadioItem value="light" className="cursor-pointer py-2">
            <Sun className="h-4 w-4" />
            {t("Light")}
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="dark" className="cursor-pointer py-2">
            <Moon className="h-4 w-4" />
            {t("Dark")}
          </DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
