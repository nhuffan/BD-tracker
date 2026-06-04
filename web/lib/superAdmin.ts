import type { User } from "@supabase/supabase-js";

export const SUPER_ADMIN_UID = "a7d27d0a-3f3a-4473-9bae-09ecdb703093";
export const SUPER_ADMIN_EMAILS = new Set(["phantamnhu7867@gmail.com"]);

export function isSuperAdminUser(user: User | null | undefined) {
  return (
    user?.id === SUPER_ADMIN_UID ||
    (user?.email ? SUPER_ADMIN_EMAILS.has(user.email.toLowerCase()) : false)
  );
}
