"use client";

import dynamic from "next/dynamic";
import type { ReactNode } from "react";
import {
  BarChart3,
  ClipboardCheck,
  Megaphone,
  MessageSquareText,
  ReceiptText,
  ShieldCheck,
  Users,
  type LucideIcon,
} from "lucide-react";
import type { UserRoleContextValue } from "@/lib/auth/userRoleContext";

export interface TabItem {
  id: string;
  label: string;
  icon: LucideIcon;
  render: (context: UserRoleContextValue) => ReactNode;
}

function TabLoading({ label }: { label: string }) {
  return (
    <div className="flex min-h-[320px] items-center justify-center text-sm font-medium text-muted-foreground">
      Đang tải {label}...
    </div>
  );
}

const RecordsPage = dynamic(() => import("@/components/performance/RecordsPage"), {
  loading: () => <TabLoading label="Team Performance" />,
});

const CustomerTrackingPage = dynamic(() => import("@/components/customer/CustomerTrackingPage"), {
  loading: () => <TabLoading label="Customers" />,
});

const ManagementPage = dynamic(() => import("@/components/manager/ManagementPage"), {
  loading: () => <TabLoading label="Management" />,
});

const QAPage = dynamic(() => import("@/components/qa/QAPage"), {
  loading: () => <TabLoading label="Q&A" />,
});

const AdsTrackingPage = dynamic(() => import("@/components/ads-tracking/AdsTrackingPage"), {
  loading: () => <TabLoading label="Ads Tracking" />,
});

const ApprovalsPage = dynamic(() => import("@/components/approvals/ApprovalsPage"), {
  loading: () => <TabLoading label="Approvals" />,
});

const MerchantInvoicesPage = dynamic(() => import("@/components/merchant-invoices/MerchantInvoicesPage"), {
  loading: () => <TabLoading label="Hóa Đơn Merchant" />,
});

const HIDDEN_TAB_IDS = new Set(["ads-tracking", "approvals"]);

const ALL_TABS_REGISTRY: TabItem[] = [
  {
    id: "home",
    label: "Team Performance",
    icon: BarChart3,
    render: ({ isAdmin }) => <RecordsPage isAdmin={isAdmin} />,
  },
  {
    id: "tracking",
    label: "Customers",
    icon: Users,
    render: ({ isAdmin }) => <CustomerTrackingPage isAdmin={isAdmin} />,
  },
  {
    id: "data",
    label: "Management",
    icon: ShieldCheck,
    render: ({ isAdmin }) => <ManagementPage isAdmin={isAdmin} />,
  },
  {
    id: "qa",
    label: "Q&A",
    icon: MessageSquareText,
    render: ({ isAdmin, currentUserId }) => (
      <QAPage isAdmin={isAdmin} currentUserId={currentUserId} />
    ),
  },
  {
    id: "ads-tracking",
    label: "Ads Tracking",
    icon: Megaphone,
    render: ({ isAdmin, currentUserId }) => (
      <AdsTrackingPage isAdmin={isAdmin} currentUserId={currentUserId} />
    ),
  },
  {
    id: "approvals",
    label: "Approvals",
    icon: ClipboardCheck,
    render: ({ isSuperAdmin, currentUserId }) => (
      <ApprovalsPage isAdmin={isSuperAdmin} currentUserId={currentUserId} />
    ),
  },
  {
    id: "merchant-invoices",
    label: "Invoices",
    icon: ReceiptText,
    render: ({ isAdmin, isSuperAdmin }) => (
      <MerchantInvoicesPage isAdmin={isAdmin || isSuperAdmin} />
    ),
  },
];

export const TABS_REGISTRY: TabItem[] = ALL_TABS_REGISTRY.filter(
  (tab) => !HIDDEN_TAB_IDS.has(tab.id)
);

export const DEFAULT_TAB_ID = TABS_REGISTRY[0]?.id ?? "home";

export function normalizeTabId(value: string | null) {
  return TABS_REGISTRY.some((tab) => tab.id === value) ? value ?? DEFAULT_TAB_ID : DEFAULT_TAB_ID;
}
