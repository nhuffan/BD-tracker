"use client";

import { useRouter } from "next/navigation";
import { ShieldX } from "lucide-react";
import { Button } from "@/components/ui/button";
import SettingsMenu from "@/components/SettingsMenu";
import { useI18n } from "@/lib/i18n/I18nProvider";

export default function AccountDisabledPage() {
  const router = useRouter();
  const { t } = useI18n();

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-muted/30 p-4">
      <div className="absolute right-4 top-4">
        <SettingsMenu className="h-10 w-10" />
      </div>

      <div className="w-full max-w-md rounded-xl border bg-card p-5 text-card-foreground shadow-sm">
        <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-md bg-destructive/10 text-destructive">
          <ShieldX className="h-5 w-5" />
        </div>

        <div className="space-y-2">
          <h1 className="text-xl font-semibold">{t("Account disabled")}</h1>
          <p className="text-sm leading-6 text-muted-foreground">
            {t("This account no longer has access. The company is too terrible to use Pink's website. If you really need a comeback, contact her.")}
          </p>
        </div>

        <Button
          className="mt-5 w-full cursor-pointer"
          variant="outline"
          onClick={() => router.replace("/login")}
        >
          {t("Back to login")}
        </Button>
      </div>
    </div>
  );
}
