"use client";

import { useMemo } from "react";
import { TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Database,
  LogOut,
} from "lucide-react";
import ThemeToggle from "@/components/ThemeToggle";
import type { TabItem } from "@/lib/app/tabsConfig";

function getInitialsFromEmail(email?: string | null) {
  if (!email) return "??";

  const namePart = email.split("@")[0] || "";
  const parts = namePart
    .replace(/[^a-zA-Z0-9._-]/g, "")
    .split(/[._-]+/)
    .filter(Boolean);

  if (parts.length >= 2) {
    return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
  }

  return namePart.slice(0, 2).toUpperCase() || "??";
}

export default function AppHeader({
  email,
  onLogout,
  tabs,
}: {
  email?: string | null;
  onLogout: () => void;
  tabs: TabItem[];
}) {
  const initials = useMemo(() => getInitialsFromEmail(email), [email]);

  const tabClass = `
    h-16 rounded-none border-0 border-b-2 border-transparent
    bg-transparent px-5 text-[15px] font-semibold
    text-muted-foreground shadow-none
    transition-colors duration-200

    hover:text-foreground

    data-[state=active]:border-b-2
    data-[state=active]:border-primary
    data-[state=active]:bg-transparent
    data-[state=active]:text-primary
    data-[state=active]:shadow-none
  `;

  return (
    <header className="sticky top-0 z-20 border-b border-border bg-background/95 backdrop-blur">
      <div className="mx-auto grid h-16 w-full grid-cols-[1fr_auto_1fr] items-center px-6">
        <div className="flex items-center">
          <div className="hidden xl:flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
              <Database className="h-4 w-4" />
            </div>

            <div className="text-xl font-extrabold tracking-tight text-foreground">
              OPERATIONS HUB
            </div>
          </div>
        </div>

        <div className="flex justify-center min-w-0 flex-1">
          <TabsList className="h-16 w-full min-w-0 rounded-none border-0 bg-transparent p-0 shadow-none">
            <div className="flex min-w-0 overflow-x-auto scrollbar-hide">
              {tabs.map((tab) => {
                const Icon = tab.icon;

                return (
                  <TabsTrigger key={tab.id} value={tab.id} className={tabClass}>
                    <Icon className="mr-2 h-5 w-5" />
                    {tab.label}
                  </TabsTrigger>
                );
              })}
            </div>
          </TabsList>
        </div>

        <div className="flex justify-end gap-2 pl-4">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="rounded-full outline-none ring-offset-background transition focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
                <Avatar className="h-10 w-10 border shadow-sm">
                  <AvatarFallback className="bg-primary/10 text-sm font-bold text-primary">
                    {initials}
                  </AvatarFallback>
                </Avatar>
              </button>
            </DropdownMenuTrigger>

            <DropdownMenuContent align="end" className="w-64 p-1">
              <DropdownMenuItem
                onClick={onLogout}
                className="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-3 transition-colors hover:bg-muted focus:bg-muted"
              >
                <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">
                  {email ?? "No email"}
                </span>

                <LogOut className="h-4 w-4 shrink-0 text-muted-foreground" />
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <ThemeToggle className="h-10 w-10" />
        </div>
      </div>
    </header>
  );
}
