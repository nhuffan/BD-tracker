"use client";

import { useEffect, useState } from "react";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
import { useCurrentUserRole } from "@/lib/useCurrentUserRole";
import AppHeader from "@/components/AppHeader";
import { Loader2 } from "lucide-react";
import RecordsPage from "./performance/RecordsPage";
import CustomerTrackingPage from "./customer/CustomerTrackingPage";
import ManagementPage from "@/components/manager/ManagementPage";
import WomensDayBackground from "@/components/WomensDayBackground";
import QAPage from "./qa/QAPage";
import ApprovalsPage from "./approvals/ApprovalsPage";
import AdsTrackingPage from "./ads-tracking/AdsTrackingPage";

export default function HomeTabs() {
  const router = useRouter();
  const { isAdmin, isSuperAdmin, loading } = useCurrentUserRole();
  const [activeTab, setActiveTab] = useState("home");
  const [email, setEmail] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string>("");

  useEffect(() => {
    const savedTab = window.localStorage.getItem("home-active-tab");

    if (
      savedTab === "home" ||
      savedTab === "tracking" ||
      savedTab === "data" ||
      savedTab === "qa" ||
      savedTab === "approvals" ||
      savedTab === "ads-tracking"
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

  async function handleLogout() {
    await supabase.auth.signOut();
    router.replace("/login");
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="relative h-screen overflow-hidden bg-muted/30">
      <WomensDayBackground />

      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
        <AppHeader email={email} onLogout={handleLogout} />

        <main className="relative z-10 h-[calc(100vh-64px)] overflow-y-auto px-6 py-8">
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
            <QAPage
              isAdmin={isAdmin}
              currentUserId={currentUserId}
            />
          </TabsContent>

          <TabsContent
            value="approvals"
            forceMount
            className={activeTab === "approvals" ? "mt-0 w-full" : "mt-0 hidden"}
          >
            <ApprovalsPage
              isAdmin={isSuperAdmin}
              currentUserId={currentUserId}
            />
          </TabsContent>

          <TabsContent
            value="ads-tracking"
            forceMount
            className={activeTab === "ads-tracking" ? "mt-0 w-full" : "mt-0 hidden"}
          >
            <AdsTrackingPage
              isAdmin={isAdmin}
              currentUserId={currentUserId}
            />
          </TabsContent>

        </main>
      </Tabs>
    </div>
  );
}