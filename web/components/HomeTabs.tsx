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
import StressReliefPage from "./stress/StressReliefPage";

export default function HomeTabs() {
  const router = useRouter();
  const { isAdmin, isSuperAdmin, loading } = useCurrentUserRole();
  const [activeTab, setActiveTab] = useState(() => {
    if (typeof window === "undefined") return "home";
    return window.localStorage.getItem("home-active-tab") || "home";
  });
  const [visitedTabs, setVisitedTabs] = useState<string[]>(() => {
    if (typeof window === "undefined") return ["home"];
    const storedTab = window.localStorage.getItem("home-active-tab") || "home";
    return Array.from(new Set(["home", storedTab]));
  });
  const [email, setEmail] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string>("");
  const effectiveActiveTab =
    activeTab === "stress-relief" && !isSuperAdmin ? "home" : activeTab;

  function handleTabChange(value: string) {
    if (value === "stress-relief" && !isSuperAdmin) {
      setActiveTab("home");
      setVisitedTabs((prev) => (prev.includes("home") ? prev : [...prev, "home"]));
      window.localStorage.setItem("home-active-tab", "home");
      return;
    }

    setActiveTab(value);
    setVisitedTabs((prev) => (prev.includes(value) ? prev : [...prev, value]));
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

      <Tabs value={effectiveActiveTab} onValueChange={handleTabChange} className="w-full">
        <AppHeader
          email={email}
          onLogout={handleLogout}
          isSuperAdmin={isSuperAdmin}
        />

        <main className="relative z-10 h-[calc(100vh-64px)] overflow-y-auto px-6 py-8">
          {visitedTabs.includes("home") && (
            <TabsContent
              value="home"
              forceMount
              className={effectiveActiveTab === "home" ? "mt-0 w-full" : "mt-0 hidden"}
            >
              <RecordsPage isAdmin={isAdmin} />
            </TabsContent>
          )}

          {visitedTabs.includes("tracking") && (
            <TabsContent
              value="tracking"
              forceMount
              className={effectiveActiveTab === "tracking" ? "mt-0 w-full" : "mt-0 hidden"}
            >
              <CustomerTrackingPage isAdmin={isAdmin} />
            </TabsContent>
          )}

          {visitedTabs.includes("data") && (
            <TabsContent
              value="data"
              forceMount
              className={effectiveActiveTab === "data" ? "mt-0 w-full" : "mt-0 hidden"}
            >
              <ManagementPage isAdmin={isAdmin} />
            </TabsContent>
          )}

          {visitedTabs.includes("qa") && (
            <TabsContent
              value="qa"
              forceMount
              className={effectiveActiveTab === "qa" ? "mt-0 w-full" : "mt-0 hidden"}
            >
              <QAPage
                isAdmin={isAdmin}
                currentUserId={currentUserId}
              />
            </TabsContent>
          )}

          {visitedTabs.includes("approvals") && (
            <TabsContent
              value="approvals"
              forceMount
              className={effectiveActiveTab === "approvals" ? "mt-0 w-full" : "mt-0 hidden"}
            >
              <ApprovalsPage
                isAdmin={isSuperAdmin}
                currentUserId={currentUserId}
              />
            </TabsContent>
          )}

          {visitedTabs.includes("ads-tracking") && (
            <TabsContent
              value="ads-tracking"
              forceMount
              className={effectiveActiveTab === "ads-tracking" ? "mt-0 w-full" : "mt-0 hidden"}
            >
              <AdsTrackingPage
                isAdmin={isAdmin}
                currentUserId={currentUserId}
              />
            </TabsContent>
          )}

          {isSuperAdmin && visitedTabs.includes("stress-relief") && (
            <TabsContent
              value="stress-relief"
              forceMount
              className={effectiveActiveTab === "stress-relief" ? "mt-0 w-full" : "mt-0 hidden"}
            >
              <StressReliefPage />
            </TabsContent>
          )}

        </main>
      </Tabs>
    </div>
  );
}
