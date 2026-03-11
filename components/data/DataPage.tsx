"use client";

import { useState } from "react";
import MasterManager from "./MasterManager";
import type { MasterCategory } from "@/lib/masters";
import { Users, BriefcaseBusiness, Shapes, BadgeDollarSign } from "lucide-react";
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

export default function DataPage({ isAdmin }: { isAdmin: boolean }) {
  const [activeCategory, setActiveCategory] = useState<MasterCategory>("bd");

  const activeItem =
    DATA_MENU.find((item) => item.key === activeCategory) ?? DATA_MENU[0];

  return (
    <div className="grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
      {/* Sidebar */}
      <aside>
        <div className="space-y-2">
          {DATA_MENU.map((item) => {
            const Icon = item.icon;
            const isActive = item.key === activeCategory;

            return (
              <button
                key={item.key}
                type="button"
                onClick={() => setActiveCategory(item.key)}
                className={cn(
                  "flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left transition-all",
                  "border border-transparent",
                  isActive
                    ? "bg-primary text-primary-foreground shadow-md"
                    : "hover:bg-muted text-foreground"
                )}
              >
                <div
                  className={cn(
                    "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg",
                    isActive
                      ? "bg-white/15"
                      : "bg-muted-foreground/10 text-muted-foreground"
                  )}
                >
                  <Icon className="h-5 w-5" />
                </div>

                <div className="min-w-0">
                  <div className="font-medium">{item.label}</div>
                </div>
              </button>
            );
          })}
        </div>
      </aside>

      {/* Content */}
      <section className="min-w-0">
        <div className="mb-5">
          <h1 className="text-3xl font-bold tracking-tight">
            {activeItem.label}
          </h1>
          <p className="mt-1 text-base text-muted-foreground">
            {activeItem.description}
          </p>
        </div>

        <div className="min-w-0">
          <MasterManager category={activeCategory} isAdmin={isAdmin} />
        </div>
      </section>
    </div>
  );
}