"use client";

import { Check, Languages } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useI18n } from "@/lib/i18n/I18nProvider";
import type { Locale } from "@/lib/i18n/translations";

const OPTIONS: Array<{ value: Locale; label: string }> = [
  { value: "en", label: "English" },
  { value: "vi", label: "Vietnamese" },
  { value: "zh-CN", label: "Simplified Chinese" },
];

export default function LanguageSwitcher({ className = "" }: { className?: string }) {
  const { locale, setLocale, t } = useI18n();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="icon"
          className={`cursor-pointer ${className}`}
          aria-label={t("Language")}
          title={t("Language")}
        >
          <Languages className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        <DropdownMenuLabel>{t("Language")}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {OPTIONS.map((option) => (
          <DropdownMenuItem
            key={option.value}
            className="cursor-pointer justify-between"
            onClick={() => setLocale(option.value)}
          >
            {t(option.label)}
            {locale === option.value ? <Check className="h-4 w-4" /> : null}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
