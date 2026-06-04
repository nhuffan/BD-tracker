"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
import HomeTabs from "@/components/HomeTabs";
import { isSuperAdminUser } from "@/lib/superAdmin";

export default function Page() {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    async function enforceSuperAdminAccess() {
      const { data } = await supabase.auth.getSession();

      if (!data.session) {
        router.replace("/login");
        return;
      }

      if (!isSuperAdminUser(data.session.user)) {
        await supabase.auth.signOut();
        router.replace("/account-disabled");
        return;
      }

      setReady(true);
    }

    enforceSuperAdminAccess();

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        setReady(false);
        router.replace("/login");
        return;
      }

      if (!isSuperAdminUser(session.user)) {
        setReady(false);
        setTimeout(() => {
          void supabase.auth.signOut().finally(() => {
            router.replace("/account-disabled");
          });
        }, 0);
      }
    });

    return () => sub.subscription.unsubscribe();
  }, [router]);

  if (!ready) return null;

  return <HomeTabs />;

}
