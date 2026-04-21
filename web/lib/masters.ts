import { supabase } from "./supabaseClient";

export type MasterCategory = "bd" | "bd_level" | "customer_type" | "point_type";

export type MasterItem = {
  id: string;
  category: MasterCategory;
  code: string;
  label: string;
  sort_order: number;
  is_active: boolean;
};

export async function fetchMasters(category: MasterCategory) {
  const { data, error } = await supabase
    .from("masters")
    .select("*")
    .eq("category", category)
    .order("sort_order", { ascending: true });

  if (error) throw error;
  return (data ?? []) as MasterItem[];
}

export async function createMaster(item: Omit<MasterItem, "id">) {
  const { data, error } = await supabase.from("masters").insert(item).select("*").single();
  if (error) throw error;
  return data as MasterItem;
}

export async function updateMaster(id: string, patch: Partial<Omit<MasterItem, "id" | "category">>) {
  const { data, error } = await supabase.from("masters").update(patch).eq("id", id).select("*").single();
  if (error) throw error;
  return data as MasterItem;
}

export async function deleteMaster(id: string) {
  const { error } = await supabase.from("masters").delete().eq("id", id);
  if (error) throw error;
}