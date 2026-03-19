"use client";

import { useEffect, useState } from "react";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
import RecordsPage from "./performance/RecordsPage";
import CustomerTrackingPage from "./tracking/CustomerTrackingPage";
import ManagementPage from "@/components/manager/ManagementPage";
import WomensDayBackground from "@/components/WomensDayBackground";
import { useCurrentUserRole } from "@/lib/useCurrentUserRole";
import AppHeader from "@/components/AppHeader";

export default function HomeTabs() {
  const router = useRouter();
  const { isAdmin, loading } = useCurrentUserRole();
  const [activeTab, setActiveTab] = useState("home");
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    async function loadUser() {
      const { data } = await supabase.auth.getUser();
      setEmail(data.user?.email ?? null);
    }

    loadUser();
  }, []);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.replace("/login");
  }

  if (loading) {
    return <div className="p-6 text-sm text-muted-foreground">Loading...</div>;
  }

  return (
    <div className="relative min-h-screen bg-muted/30">
      <WomensDayBackground />

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <AppHeader email={email} onLogout={handleLogout} />

        <main className="relative z-10 px-6 py-8">
          <TabsContent value="home" className="mt-0 w-full">
            <RecordsPage isAdmin={isAdmin} />
          </TabsContent>

          <TabsContent value="tracking" className="mt-0 w-full">
            <CustomerTrackingPage isAdmin={isAdmin} />
          </TabsContent>

          <TabsContent value="data" className="mt-0 w-full">
            <ManagementPage isAdmin={isAdmin} />
          </TabsContent>
        </main>
      </Tabs>
    </div>
  );
}
