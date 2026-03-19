"use client";

import { useState } from "react";
import MasterManager from "./MasterManager";
import type { MasterCategory } from "@/lib/masters";
import {
  Users,
  BriefcaseBusiness,
  Shapes,
  BadgeDollarSign,
} from "lucide-react";
import { cn } from "@/lib/utils";

const DATA_MENU: {
  key: MasterCategory;
  label: string;
  description: string;
  icon: React.ElementType;
}[] = [
  {
    key: "bd",
    label: "BD Personnel",
    description: "View and manage your business development team members.",
    icon: Users,
  },
  {
    key: "bd_level",
    label: "BD Levels",
    description: "Manage available levels for BD members.",
    icon: BriefcaseBusiness,
  },
  {
    key: "customer_type",
    label: "Customer Types",
    description: "Manage customer segmentation types.",
    icon: Shapes,
  },
  {
    key: "point_type",
    label: "Point Types",
    description: "Manage point and bonus categories.",
    icon: BadgeDollarSign,
  },
];

export default function ManagementPage({ isAdmin }: { isAdmin: boolean }) {
  const [activeCategory, setActiveCategory] = useState<MasterCategory>("bd");

  const activeItem =
    DATA_MENU.find((item) => item.key === activeCategory) ?? DATA_MENU[0];

  return (
    <div className="grid gap-6 lg:grid-cols-[200px_minmax(0,1fr)]">
      <aside className="space-y-1">
        {DATA_MENU.map((item) => {
          const Icon = item.icon;
          const isActive = item.key === activeCategory;

          return (
            <button
              key={item.key}
              type="button"
              onClick={() => setActiveCategory(item.key)}
              className={cn(
                "flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm transition-colors",
                isActive
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span className="truncate font-medium">{item.label}</span>
            </button>
          );
        })}
      </aside>

      <section className="min-w-0">
        <MasterManager
          category={activeCategory}
          isAdmin={isAdmin}
          title={activeItem.label}
        />
      </section>
    </div>
  );
}