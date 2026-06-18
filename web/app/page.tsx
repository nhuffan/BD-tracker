"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
import HomeTabs from "@/components/HomeTabs";

export default function Page() {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    async function enforceAuthenticatedAccess() {
      const { data } = await supabase.auth.getSession();

      if (!data.session) {
        router.replace("/login");
        return;
      }

      // Super admin-only gate is disabled so any valid email/password account
      // can enter the web app. Feature permissions are still handled inside
      // the app through profiles.role and isSuperAdmin where needed.
      //
      // if (!isSuperAdminUser(data.session.user)) {
      //   await supabase.auth.signOut();
      //   router.replace("/account-disabled");
      //   return;
      // }

      setReady(true);
    }

    enforceAuthenticatedAccess();

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        setReady(false);
        router.replace("/login");
        return;
      }

      // Keep regular signed-in users in the app after auth state changes.
      // The old super admin-only redirect is intentionally commented out.
      //
      // if (!isSuperAdminUser(session.user)) {
      //   setReady(false);
      //   setTimeout(() => {
      //     void supabase.auth.signOut().finally(() => {
      //       router.replace("/account-disabled");
      //     });
      //   }, 0);
      // }

      setReady(true);
    });

    return () => sub.subscription.unsubscribe();
  }, [router]);

  if (!ready) return null;

  return <HomeTabs />;

}
