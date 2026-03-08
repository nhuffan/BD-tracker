"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
import RecordsPage from "./records/RecordsPage";
import DataPage from "@/components/data/DataPage";
import { Home, Database, LogOut } from "lucide-react";
import WomensDayBackground from "@/components/WomensDayBackground";
import { useCurrentUserRole } from "@/lib/useCurrentUserRole";

export default function HomeTabs() {
  const router = useRouter();
  const { isAdmin, loading } = useCurrentUserRole();

  async function handleLogout() {
    await supabase.auth.signOut();
    router.replace("/login");
  }

  if (loading) {
    return <div className="p-6 text-sm text-muted-foreground">Loading...</div>;
  }

  return (
    <div className="relative w-full p-6">
      <WomensDayBackground />

      <Tabs defaultValue="home" className="w-full">
        <div className="mb-6 grid grid-cols-[1fr_auto_1fr] items-center">
          <div />

          <div className="flex justify-center">
            <TabsList className="h-12 rounded-xl bg-muted p-1 shadow-sm">
              <TabsTrigger
                value="home"
                className="min-w-[140px] justify-center gap-2 px-8 text-base font-medium data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow"
              >
                <Home size={18} />
                Home
              </TabsTrigger>

              <TabsTrigger
                value="data"
                className="min-w-[140px] justify-center gap-2 px-8 text-base font-medium data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow"
              >
                <Database size={18} />
                Data
              </TabsTrigger>
            </TabsList>
          </div>

          <div className="flex justify-end">
            <Button
              className="cursor-pointer"
              variant="outline"
              size="icon"
              onClick={handleLogout}
              title="Logout"
            >
              <LogOut size={18} />
            </Button>
          </div>
        </div>

        <TabsContent value="home" className="mt-0 w-full">
          <RecordsPage isAdmin={isAdmin} />
        </TabsContent>

        <TabsContent value="data" className="mt-0 w-full">
          <DataPage isAdmin={isAdmin} />
        </TabsContent>
      </Tabs>
    </div>
  );
}