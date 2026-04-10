"use client";


import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";


export type AppRole = "admin" | "viewer";

const SUPER_ADMIN_UID = "a7d27d0a-3f3a-4473-9bae-09ecdb703093";


export function useCurrentUserRole() {
  const [role, setRole] = useState<AppRole>("viewer");
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);


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

      if (mounted) setUserId(user.id);


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
    isSuperAdmin: userId === SUPER_ADMIN_UID,
  };
}