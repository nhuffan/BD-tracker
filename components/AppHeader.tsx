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
  ShieldCheck,
  BarChart3,
  Users,
} from "lucide-react";

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
}: {
  email?: string | null;
  onLogout: () => void;
}) {
  const initials = useMemo(() => getInitialsFromEmail(email), [email]);

  return (
    <header className="sticky top-0 z-20 border-b border-border bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-20 w-full items-center justify-between px-6">
        <div className="hidden md:flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
            <Database className="h-5 w-5" />
          </div>

          <div>
            <div className="text-2xl font-extrabold tracking-tight text-foreground">
              OPERATIONS HUB
            </div>
          </div>
        </div>

        <div>
          <TabsList className="h-12 rounded-xl bg-muted/70 p-1 shadow-none">
            <TabsTrigger
              value="home"
              className="min-w-[160px] gap-2 rounded-xl px-5 py-2.5 text-base font-semibold
              data-[state=active]:bg-background
              data-[state=active]:text-primary
              data-[state=active]:shadow-sm"
            >
              <BarChart3 className="h-4 w-4" />
              Team Performance
            </TabsTrigger>

            <TabsTrigger
              value="tracking"
              className="min-w-[160px] gap-2 rounded-xl px-5 py-2.5 text-base font-semibold
              data-[state=active]:bg-background
              data-[state=active]:text-primary
              data-[state=active]:shadow-sm"
            >
              <Users className="h-4 w-4" />
              Customers
            </TabsTrigger>

            <TabsTrigger
              value="data"
              className="min-w-[160px] gap-2 rounded-xl px-5 py-2.5 text-base font-semibold
              data-[state=active]:bg-background
              data-[state=active]:text-primary
              data-[state=active]:shadow-sm"
            >
              <ShieldCheck className="h-4 w-4" />
              Management
            </TabsTrigger>
          </TabsList>
        </div>

        <div className="flex items-center gap-3">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="rounded-full outline-none ring-offset-background transition focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
                <Avatar className="h-11 w-11 border shadow-sm">
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
        </div>
      </div>
    </header>
  );
}