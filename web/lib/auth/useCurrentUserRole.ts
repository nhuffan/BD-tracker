"use client";


import { useEffect, useState } from "react";
import { supabase } from "@/lib/integrations/supabase/client";
import { isSuperAdminUser } from "@/lib/auth/superAdmin";


export type AppRole = "admin" | "viewer";


export function useCurrentUserRole() {
  const [role, setRole] = useState<AppRole>("viewer");
  const [loading, setLoading] = useState(true);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);


  useEffect(() => {
    let mounted = true;


    async function loadRole() {
      setLoading(true);


      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        if (mounted) {
          setRole("viewer");
          setLoading(false);
        }
        return;
      }

      if (mounted) {
        setIsSuperAdmin(isSuperAdminUser(user));
      }


      const { data, error } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();


      if (mounted) {
        if (error || !data?.role) {
          setRole("viewer");
        } else {
          setRole(data.role as AppRole);
        }
        setLoading(false);
      }
    }


    loadRole();


    return () => {
      mounted = false;
    };
  }, []);


  return {
    role,
    loading,
    isAdmin: role === "admin",
    isViewer: role === "viewer",
    isSuperAdmin,
  };
}
