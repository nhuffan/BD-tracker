"use client";

import { useState } from "react";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { supabase } from "@/lib/integrations/supabase/client";
import { useRouter } from "next/navigation";
import AppHeader from "@/components/AppHeader";
import { Loader2 } from "lucide-react";
import WomensDayBackground from "@/components/WomensDayBackground";
import { DEFAULT_TAB_ID, normalizeTabId, TABS_REGISTRY } from "@/lib/app/tabsConfig";
import { UserRoleProvider, useUserRole } from "@/lib/auth/userRoleContext";

function HomeTabsContent() {
  const router = useRouter();
  const userRole = useUserRole();
  const { email, loading } = userRole;
  const [activeTab, setActiveTab] = useState(() => {
    if (typeof window === "undefined") return DEFAULT_TAB_ID;
    return normalizeTabId(window.localStorage.getItem("home-active-tab"));
  });
  const [visitedTabs, setVisitedTabs] = useState<string[]>(() => {
    if (typeof window === "undefined") return [DEFAULT_TAB_ID];
    const storedTab = normalizeTabId(window.localStorage.getItem("home-active-tab"));
    return Array.from(new Set([DEFAULT_TAB_ID, storedTab]));
  });
  const effectiveActiveTab = normalizeTabId(activeTab);

  function handleTabChange(value: string) {
    const nextTab = normalizeTabId(value);

    if (nextTab !== value) {
      setActiveTab(nextTab);
      setVisitedTabs((prev) => (prev.includes(nextTab) ? prev : [...prev, nextTab]));
      window.localStorage.setItem("home-active-tab", nextTab);
      return;
    }

    setActiveTab(nextTab);
    setVisitedTabs((prev) => (prev.includes(nextTab) ? prev : [...prev, nextTab]));
    window.localStorage.setItem("home-active-tab", nextTab);
  }

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
          tabs={TABS_REGISTRY}
        />

        <main className="relative z-10 h-[calc(100vh-64px)] overflow-y-auto px-6 py-8">
          {TABS_REGISTRY.map((tab) => {
            if (!visitedTabs.includes(tab.id)) return null;

            return (
              <TabsContent
                key={tab.id}
                value={tab.id}
                forceMount
                className={effectiveActiveTab === tab.id ? "mt-0 w-full" : "mt-0 hidden"}
              >
                {tab.render(userRole)}
              </TabsContent>
            );
          })}
        </main>
      </Tabs>
    </div>
  );
}

export default function HomeTabs() {
  return (
    <UserRoleProvider>
      <HomeTabsContent />
    </UserRoleProvider>
  );
}
