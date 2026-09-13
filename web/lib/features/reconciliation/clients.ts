import { supabase } from "@/lib/integrations/supabase/client";

export interface ReconciliationClient {
  id: string;
  name: string;
  address: string;
  taxCode: string;
  tel: string;
  email: string;
  createdAt: string;
  updatedAt: string;
}

export interface ReconciliationClientInput {
  name: string;
  address: string;
  taxCode: string;
  tel: string;
  email: string;
}

interface ReconciliationClientRow {
  id: string;
  name: string;
  address: string;
  tax_code: string;
  tel: string;
  email: string;
  created_at: string;
  updated_at: string;
}

function mapClient(row: ReconciliationClientRow): ReconciliationClient {
  return {
    id: row.id,
    name: row.name,
    address: row.address,
    taxCode: row.tax_code,
    tel: row.tel,
    email: row.email,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function cleanInput(input: ReconciliationClientInput) {
  return {
    name: input.name.trim(),
    address: input.address.trim(),
    tax_code: input.taxCode.trim(),
    tel: input.tel.trim(),
    email: input.email.trim(),
  };
}

export async function listReconciliationClients() {
  const { data, error } = await supabase
    .from("reconciliation_clients")
    .select("id, name, address, tax_code, tel, email, created_at, updated_at")
    .order("name", { ascending: true });

  if (error) throw error;
  return ((data ?? []) as ReconciliationClientRow[]).map(mapClient);
}

export async function createReconciliationClient(input: ReconciliationClientInput) {
  const { data, error } = await supabase
    .from("reconciliation_clients")
    .insert(cleanInput(input))
    .select("id, name, address, tax_code, tel, email, created_at, updated_at")
    .single();

  if (error) throw error;
  return mapClient(data as ReconciliationClientRow);
}

export async function updateReconciliationClient(
  id: string,
  input: ReconciliationClientInput
) {
  const { data, error } = await supabase
    .from("reconciliation_clients")
    .update({ ...cleanInput(input), updated_at: new Date().toISOString() })
    .eq("id", id)
    .select("id, name, address, tax_code, tel, email, created_at, updated_at")
    .single();

  if (error) throw error;
  return mapClient(data as ReconciliationClientRow);
}

export async function deleteReconciliationClient(id: string) {
  const { error } = await supabase.from("reconciliation_clients").delete().eq("id", id);
  if (error) throw error;
}
