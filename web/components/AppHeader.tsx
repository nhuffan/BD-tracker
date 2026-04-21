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
  MessageSquareText,
  ClipboardCheck,
  Megaphone,
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
    <header className="sticky top-0 z-20 border-b border-border bg-white/95 backdrop-blur">
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
              <TabsTrigger value="home" className={tabClass}>
                <BarChart3 className="mr-2 h-6 w-6" />
                Team Performance
              </TabsTrigger>

              <TabsTrigger value="tracking" className={tabClass}>
                <Users className="mr-2 h-5 w-5" />
                Customers
              </TabsTrigger>

              <TabsTrigger value="data" className={tabClass}>
                <ShieldCheck className="mr-2 h-5 w-5" />
                Management
              </TabsTrigger>

              <TabsTrigger value="qa" className={tabClass}>
                <MessageSquareText className="mr-2 h-5 w-5" />
                Q&A
              </TabsTrigger>

              <TabsTrigger value="approvals" className={tabClass}>
                <ClipboardCheck className="mr-2 h-5 w-5" />
                Approvals
              </TabsTrigger>

              <TabsTrigger value="ads-tracking" className={tabClass}>
                <Megaphone className="mr-2 h-5 w-5" />
                Ads Tracking
              </TabsTrigger>
            </div>
          </TabsList>
        </div>

        <div className="flex justify-end pl-4">
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
        </div>
      </div>
    </header>
  );
}