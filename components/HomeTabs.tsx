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
import QATab from "./qa/QATab";

export default function HomeTabs() {
  const router = useRouter();
  const { isAdmin, loading } = useCurrentUserRole();
  const [activeTab, setActiveTab] = useState("home");
  const [email, setEmail] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string>("");
  const [bdMap, setBdMap] = useState<Record<string, string>>({});
  const [qaReady, setQaReady] = useState(false);

  useEffect(() => {
    const savedTab = window.localStorage.getItem("home-active-tab");

    if (
      savedTab === "home" ||
      savedTab === "tracking" ||
      savedTab === "data" ||
      savedTab === "qa"
    ) {
      setActiveTab(savedTab);
    }
  }, []);

  function handleTabChange(value: string) {
    setActiveTab(value);
    window.localStorage.setItem("home-active-tab", value);
  }

  useEffect(() => {
    async function loadUser() {
      const { data } = await supabase.auth.getUser();
      setEmail(data.user?.email ?? null);
      setCurrentUserId(data.user?.id ?? "");
    }

    loadUser();
  }, []);

  useEffect(() => {
    async function loadBdMap() {
      const { data, error } = await supabase
        .from("masters")
        .select("id, label")
        .eq("category", "bd")
        .eq("is_active", true)
        .order("label", { ascending: true });

      if (error) {
        console.error("Failed to load BD masters:", error);
        return;
      }

      const map: Record<string, string> = {};
      (data ?? []).forEach((item) => {
        map[item.id] = item.label;
      });

      setBdMap(map);
      setQaReady(true);
    }

    loadBdMap();
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

      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
        <AppHeader email={email} onLogout={handleLogout} />

        <main className="relative z-10 px-6 py-8">
          <TabsContent
            value="home"
            forceMount
            className={activeTab === "home" ? "mt-0 w-full" : "mt-0 hidden"}
          >
            <RecordsPage isAdmin={isAdmin} />
          </TabsContent>

          <TabsContent
            value="tracking"
            forceMount
            className={activeTab === "tracking" ? "mt-0 w-full" : "mt-0 hidden"}
          >
            <CustomerTrackingPage isAdmin={isAdmin} />
          </TabsContent>

          <TabsContent
            value="data"
            forceMount
            className={activeTab === "data" ? "mt-0 w-full" : "mt-0 hidden"}
          >
            <ManagementPage isAdmin={isAdmin} />
          </TabsContent>

          <TabsContent
            value="qa"
            forceMount
            className={activeTab === "qa" ? "mt-0 w-full" : "mt-0 hidden"}
          >
            {!qaReady ? (
              <div className="p-4 text-sm text-muted-foreground">Loading...</div>
            ) : (
              <QATab
                isAdmin={isAdmin}
                bdMap={bdMap}
                currentUserId={currentUserId}
              />
            )}
          </TabsContent>
        </main>
      </Tabs>
    </div>
  );
}