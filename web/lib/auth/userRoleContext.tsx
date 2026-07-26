"use client";

import { createContext, ReactNode, useContext, useEffect, useState } from "react";
import { isSuperAdminUser } from "@/lib/auth/superAdmin";
import { supabase } from "@/lib/integrations/supabase/client";

export type AppRole = "admin" | "viewer";

export interface UserRoleContextValue {
  role: AppRole;
  isAdmin: boolean;
  isViewer: boolean;
  isSuperAdmin: boolean;
  currentUserId: string;
  email: string | null;
  loading: boolean;
}

const UserRoleContext = createContext<UserRoleContextValue | undefined>(undefined);

export function UserRoleProvider({ children }: { children: ReactNode }) {
  const [role, setRole] = useState<AppRole>("viewer");
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [currentUserId, setCurrentUserId] = useState("");
  const [email, setEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function loadUserRole() {
      setLoading(true);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!mounted) return;

      if (!user) {
        setRole("viewer");
        setIsSuperAdmin(false);
        setCurrentUserId("");
        setEmail(null);
        setLoading(false);
        return;
      }

      setCurrentUserId(user.id);
      setEmail(user.email ?? null);
      setIsSuperAdmin(isSuperAdminUser(user));

      const { data, error } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      if (!mounted) return;

      setRole(error || !data?.role ? "viewer" : (data.role as AppRole));
      setLoading(false);
    }

    loadUserRole();

    return () => {
      mounted = false;
    };
  }, []);

  const value: UserRoleContextValue = {
    role,
    isAdmin: role === "admin",
    isViewer: role === "viewer",
    isSuperAdmin,
    currentUserId,
    email,
    loading,
  };

  return <UserRoleContext.Provider value={value}>{children}</UserRoleContext.Provider>;
}

export function useUserRole() {
  const context = useContext(UserRoleContext);

  if (!context) {
    throw new Error("useUserRole must be used within a UserRoleProvider");
  }

  return context;
}
