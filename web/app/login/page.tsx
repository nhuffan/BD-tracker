"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();

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
        setMsg("Invalid email or password.");
        return;
      }

      setMsg("Login successful. Redirecting...");
      router.replace("/");
    } catch (e: any) {
      setMsg(`Login exception: ${e?.message ?? e}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-4 border rounded-xl p-4">
        <div className="space-y-1">
          <h1 className="text-xl font-semibold">Login</h1>
          <p className="text-sm text-muted-foreground">
            Sign in with your assigned account.
          </p>
        </div>

        <Input
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
        />

        <Input
          placeholder="Password"
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
          {loading ? "Logging in..." : "Login"}
        </Button>

        {msg && <p className="text-sm text-muted-foreground">{msg}</p>}
      </div>
    </div>
  );
}