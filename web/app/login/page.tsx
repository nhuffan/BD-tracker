"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useRouter } from "next/navigation";
import SettingsMenu from "@/components/SettingsMenu";
import { useI18n } from "@/lib/i18n/I18nProvider";

export default function LoginPage() {
  const router = useRouter();
  const { t } = useI18n();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) router.replace("/");
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) router.replace("/");
    });

    return () => sub.subscription.unsubscribe();
  }, [router]);

  async function signIn() {
    try {
      setLoading(true);
      setMsg(null);

      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        setMsg(t("Invalid email or password."));
        return;
      }

      setMsg(t("Login successful. Redirecting..."));
      router.replace("/");
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : String(error);
      setMsg(t("Login exception: {{message}}", { message }));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-muted/30 p-4">
      <div className="absolute right-4 top-4">
        <SettingsMenu className="h-10 w-10" />
      </div>

      <div className="w-full max-w-sm space-y-4 rounded-xl border bg-card p-4 text-card-foreground shadow-sm">
        <div className="space-y-1">
          <h1 className="text-xl font-semibold">{t("Login")}</h1>
          <p className="text-sm text-muted-foreground">
            {t("Sign in with your assigned account.")}
          </p>
        </div>

        <Input
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
        />

        <Input
          placeholder={t("Password")}
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
          onKeyDown={(e) => {
            if (e.key === "Enter" && !loading) {
              signIn();
            }
          }}
        />

        <Button className="w-full cursor-pointer" onClick={signIn} disabled={loading}>
          {loading ? t("Logging in...") : t("Login")}
        </Button>

        {msg && <p className="text-sm text-muted-foreground">{msg}</p>}
      </div>

      
    </div>
  );
}
