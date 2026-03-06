"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
import RecordsPage from "./records/RecordsPage";
import DataPage from "@/components/data/DataPage";
import { Home, Database, LogOut } from "lucide-react";

export default function HomeTabs() {
  const router = useRouter();

  async function handleLogout() {
    await supabase.auth.signOut();
    router.replace("/login");
  }

  return (
    <div className="w-full p-6">
      <Tabs defaultValue="home" className="w-full">
        {/* Header */}
        <div className="mb-6 grid grid-cols-[1fr_auto_1fr] items-center">
          {/* Left spacer */}
          <div />

          {/* Center Tabs */}
          <div className="flex justify-center">
            <TabsList className="h-12 bg-muted rounded-xl p-1 shadow-sm">
              <TabsTrigger
                value="home"
                className="flex items-center gap-2 px-8 min-w-[140px] justify-center text-base font-medium
                  data-[state=active]:bg-background
                  data-[state=active]:shadow
                  data-[state=active]:text-primary
                "
              >
                <Home size={18} />
                Home
              </TabsTrigger>

              <TabsTrigger
                value="data"
                className="flex items-center gap-2 px-8 min-w-[140px] justify-center text-base font-medium
                  data-[state=active]:bg-background
                  data-[state=active]:shadow
                  data-[state=active]:text-primary
                "
              >
                <Database size={18} />
                Data
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Logout */}
          <div className="flex justify-end">
            <Button
              variant="outline"
              size="icon"
              onClick={handleLogout}
              title="Logout"
            >
              <LogOut size={18} />
            </Button>
          </div>
        </div>

        {/* Content */}
        <TabsContent value="home" className="w-full mt-0">
          <RecordsPage />
        </TabsContent>

        <TabsContent value="data" className="w-full mt-0">
          <DataPage />
        </TabsContent>
      </Tabs>
    </div>
  );
}