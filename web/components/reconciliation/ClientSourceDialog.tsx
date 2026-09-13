"use client";

import { type FormEvent, type ReactNode, useEffect, useMemo, useState } from "react";
import { Check, Loader2, Pencil, Plus, Search, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  createReconciliationClient,
  deleteReconciliationClient,
  updateReconciliationClient,
  type ReconciliationClient,
  type ReconciliationClientInput,
} from "@/lib/features/reconciliation/clients";

const EMPTY_FORM: ReconciliationClientInput = {
  name: "",
  address: "",
  taxCode: "",
  tel: "",
  email: "",
};

function ClientFormField({
  id,
  label,
  optional = false,
  children,
  className = "",
}: {
  id: string;
  label: string;
  optional?: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`min-w-0 space-y-1.5 ${className}`}>
      <div className="flex items-center justify-between gap-2">
        <Label htmlFor={id}>{label}</Label>
        {optional ? (
          <span className="text-[11px] font-medium text-muted-foreground">Optional</span>
        ) : null}
      </div>
      {children}
    </div>
  );
}

interface ClientSourceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clients: ReconciliationClient[];
  onChanged: (client?: ReconciliationClient) => Promise<void> | void;
  mode: "directory" | "create";
}

export default function ClientSourceDialog({
  open,
  onOpenChange,
  clients,
  onChanged,
  mode,
}: ClientSourceDialogProps) {
  const [form, setForm] = useState<ReconciliationClientInput>(EMPTY_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ReconciliationClient | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const filteredClients = useMemo(() => {
    const query = searchQuery.trim().toLocaleLowerCase("vi");
    if (!query) return clients;
    return clients.filter((client) =>
      [client.name, client.address, client.taxCode, client.tel, client.email].some((value) =>
        value.toLocaleLowerCase("vi").includes(query)
      )
    );
  }, [clients, searchQuery]);

  const hasEditChanges = useMemo(() => {
    if (!editingId) return false;
    const client = clients.find((item) => item.id === editingId);
    if (!client) return false;

    return (
      form.name.trim() !== client.name ||
      form.address.trim() !== client.address ||
      form.taxCode.trim() !== client.taxCode ||
      form.tel.trim() !== client.tel ||
      form.email.trim() !== client.email
    );
  }, [clients, editingId, form]);

  useEffect(() => {
    if (open) {
      setForm(EMPTY_FORM);
      setEditingId(null);
      setSearchQuery("");
    }
  }, [open, mode]);

  function updateField(field: keyof ReconciliationClientInput, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function startEdit(client: ReconciliationClient) {
    setEditingId(client.id);
    setForm({
      name: client.name,
      address: client.address,
      taxCode: client.taxCode,
      tel: client.tel,
      email: client.email,
    });
  }

  function resetForm() {
    setEditingId(null);
    setForm(EMPTY_FORM);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if ([form.name, form.address, form.taxCode].some((value) => !value.trim())) {
      toast.error("Enter the client name, address, and tax code.");
      return;
    }

    setSaving(true);
    try {
      const saved = editingId
        ? await updateReconciliationClient(editingId, form)
        : await createReconciliationClient(form);
      await onChanged(saved);
      toast.success(editingId ? "Client updated." : "Client added to the source.");
      resetForm();
      if (mode === "create") onOpenChange(false);
    } catch (caught) {
      const error = caught as { code?: string; message?: string };
      toast.error(
        error.code === "23505"
          ? "This client name already exists in the source."
          : error.message || "Could not save the client."
      );
    } finally {
      setSaving(false);
    }
  }

  async function confirmDelete() {
    if (!deleteTarget || deleting) return;
    setDeleting(true);
    try {
      await deleteReconciliationClient(deleteTarget.id);
      await onChanged();
      toast.success("Client removed from the source.");
      setDeleteTarget(null);
      if (editingId === deleteTarget.id) resetForm();
    } catch (caught) {
      const error = caught as { message?: string };
      toast.error(error.message || "Could not delete the client.");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <>
      <Dialog
        open={open}
        onOpenChange={(nextOpen) => {
          if (saving) return;
          onOpenChange(nextOpen);
        }}
      >
        <DialogContent
          showCloseButton={mode === "create"}
          className={
            mode === "directory"
              ? "h-[430px] max-h-[calc(100dvh-2rem)] grid-rows-[auto_minmax(0,1fr)_auto] gap-0 overflow-hidden p-0 sm:w-[768px] sm:max-w-3xl"
              : "max-h-[92dvh] grid-rows-[auto_minmax(0,1fr)_auto] gap-0 overflow-hidden p-0 sm:max-w-3xl"
          }
        >
          {mode === "create" ? (
            <DialogHeader className="border-b bg-card px-5 py-4 pr-12 sm:px-6 sm:py-5">
              <DialogTitle className="text-xl font-semibold tracking-tight">
                Add client
              </DialogTitle>
              <DialogDescription>
                Add recipient details to the shared client source.
              </DialogDescription>
            </DialogHeader>
          ) : (
            <DialogHeader className="h-0 overflow-hidden p-0">
              <DialogTitle className="sr-only">Client directory</DialogTitle>
              <DialogDescription className="sr-only">
                Clients available when exporting an SOA.
              </DialogDescription>
            </DialogHeader>
          )}

          <div className="min-h-0 space-y-4 overflow-y-auto bg-muted/25 px-4 py-4 sm:px-6 sm:py-5">
            {mode === "create" ? (
              <form
                id="reconciliation-client-form"
                onSubmit={submit}
                className="p-1 sm:p-0"
              >
                <div className="grid gap-4 sm:grid-cols-2">
                  <ClientFormField
                    id="reconciliation-client-name"
                    label="Client name"
                    className="sm:col-span-2"
                  >
                    <Input
                      id="reconciliation-client-name"
                      className="h-10"
                      value={form.name}
                      onChange={(event) => updateField("name", event.target.value)}
                      placeholder="Example: ABC Company"
                      required
                    />
                  </ClientFormField>
                  <ClientFormField
                    id="reconciliation-client-address"
                    label="Address"
                    className="sm:col-span-2"
                  >
                    <Input
                      id="reconciliation-client-address"
                      className="h-10"
                      value={form.address}
                      onChange={(event) => updateField("address", event.target.value)}
                      placeholder="Example: 123 Nguyen Hue Street, Ho Chi Minh City"
                      required
                    />
                  </ClientFormField>
                  <ClientFormField id="reconciliation-client-tax-code" label="Tax code">
                    <Input
                      id="reconciliation-client-tax-code"
                      className="h-10"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      value={form.taxCode}
                      onChange={(event) =>
                        updateField("taxCode", event.target.value.replace(/\D/g, ""))
                      }
                      placeholder="Example: 0312345678"
                      required
                    />
                  </ClientFormField>
                  <ClientFormField id="reconciliation-client-tel" label="Tel" optional>
                    <Input
                      id="reconciliation-client-tel"
                      className="h-10"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      value={form.tel}
                      onChange={(event) =>
                        updateField("tel", event.target.value.replace(/\D/g, ""))
                      }
                      placeholder="Example: 0901234567"
                    />
                  </ClientFormField>
                  <ClientFormField
                    id="reconciliation-client-email"
                    label="Email"
                    optional
                    className="sm:col-span-2"
                  >
                    <Input
                      id="reconciliation-client-email"
                      type="email"
                      className="h-10"
                      value={form.email}
                      onChange={(event) => updateField("email", event.target.value)}
                      placeholder="Example: billing@company.com"
                    />
                  </ClientFormField>
                </div>
              </form>
            ) : null}

            {mode === "directory" ? (
              <section className="flex h-full min-h-0 flex-col">
                <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <h3 className="font-semibold">Clients ({clients.length})</h3>
                  <div className="relative sm:w-80">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      value={searchQuery}
                      onChange={(event) => {
                        setSearchQuery(event.target.value);
                        if (editingId) resetForm();
                      }}
                      placeholder="Search name, tax code, phone, email..."
                      className="h-10 pl-9"
                    />
                  </div>
                </div>
                {filteredClients.length ? (
                  <div
                    className={`min-h-0 flex-1 rounded-xl border ${
                      filteredClients.length > 3
                        ? "overflow-y-scroll [scrollbar-gutter:stable]"
                        : "overflow-y-auto"
                    }`}
                  >
                    {filteredClients.map((client) =>
                      editingId === client.id ? (
                        <form
                          key={client.id}
                          id={`edit-client-${client.id}`}
                          onSubmit={submit}
                          className="flex h-[86px] items-center gap-2 border-b bg-muted/30 p-2"
                        >
                          <div className="min-w-0 flex-1 space-y-1.5">
                            <div className="flex min-w-0 gap-2">
                              <Input
                                id="edit-client-name"
                                aria-label="Client name"
                                className="h-8 min-w-0 flex-1"
                                value={form.name}
                                onChange={(event) => updateField("name", event.target.value)}
                                placeholder="Client name"
                                required
                              />
                              <Input
                                id="edit-client-tax-code"
                                aria-label="Tax code"
                                className="h-8 w-36 shrink-0 font-mono sm:w-44"
                                inputMode="numeric"
                                pattern="[0-9]*"
                                value={form.taxCode}
                                onChange={(event) =>
                                  updateField("taxCode", event.target.value.replace(/\D/g, ""))
                                }
                                placeholder="Tax code"
                                required
                              />
                            </div>
                            <div className="grid min-w-0 grid-cols-[minmax(0,2fr)_minmax(0,0.8fr)_minmax(0,1.2fr)] gap-2">
                              <Input
                                id="edit-client-address"
                                aria-label="Address"
                                className="h-8 min-w-0"
                                value={form.address}
                                onChange={(event) => updateField("address", event.target.value)}
                                placeholder="Address"
                                required
                              />
                              <Input
                                id="edit-client-tel"
                                aria-label="Tel"
                                className="h-8 min-w-0"
                                inputMode="numeric"
                                pattern="[0-9]*"
                                value={form.tel}
                                onChange={(event) =>
                                  updateField("tel", event.target.value.replace(/\D/g, ""))
                                }
                                placeholder="Phone number"
                              />
                              <Input
                                id="edit-client-email"
                                aria-label="Email"
                                type="email"
                                className="h-8 min-w-0"
                                value={form.email}
                                onChange={(event) => updateField("email", event.target.value)}
                                placeholder="Email"
                              />
                            </div>
                          </div>
                          <div className="flex shrink-0 items-center gap-1">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon-sm"
                              className="cursor-pointer"
                              onClick={resetForm}
                              disabled={saving}
                            >
                              <X />
                              <span className="sr-only">Cancel editing</span>
                            </Button>
                            <Button
                              type="submit"
                              size="icon-sm"
                              className="cursor-pointer disabled:cursor-not-allowed"
                              disabled={saving || !hasEditChanges}
                            >
                              {saving ? <Loader2 className="animate-spin" /> : <Check />}
                              <span className="sr-only">Save changes</span>
                            </Button>
                          </div>
                        </form>
                      ) : (
                        <div
                          key={client.id}
                          className="flex h-[86px] items-start gap-3 border-b p-3 transition-colors hover:bg-muted/50"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="font-medium text-foreground">{client.name}</p>
                              <span className="rounded-md bg-muted px-2 py-0.5 font-mono text-[11px] font-medium text-muted-foreground">
                                Tax ID: {client.taxCode}
                              </span>
                            </div>
                            <p className="mt-2 truncate text-xs text-muted-foreground">
                              {[client.address, client.tel, client.email]
                                .filter(Boolean)
                                .join(" · ")}
                            </p>
                          </div>
                          <div className="flex shrink-0 items-center justify-center gap-1">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon-sm"
                              className="cursor-pointer"
                              onClick={() => startEdit(client)}
                              title="Edit"
                            >
                              <Pencil className="h-4 w-4 text-muted-foreground" />
                              <span className="sr-only">Edit {client.name}</span>
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon-sm"
                              className="cursor-pointer"
                              onClick={() => setDeleteTarget(client)}
                              title="Delete"
                            >
                              <Trash2 className="h-4 w-4 text-muted-foreground" />
                              <span className="sr-only">Delete {client.name}</span>
                            </Button>
                          </div>
                        </div>
                      )
                    )}
                  </div>
                ) : (
                  <div className="flex min-h-0 flex-1 items-center justify-center rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
                    {clients.length
                      ? "No matching clients found."
                      : "There are no clients in the source yet."}
                  </div>
                )}
              </section>
            ) : null}
          </div>

          <DialogFooter className="border-t bg-card px-4 py-3 sm:px-6 sm:py-4">
            {mode === "create" ? (
              <Button
                type="submit"
                form="reconciliation-client-form"
                className="h-10 cursor-pointer rounded-lg px-6 sm:min-w-36"
                disabled={saving}
              >
                {saving ? <Loader2 className="animate-spin" /> : <Plus />}
                {saving ? "Saving..." : "Add to source"}
              </Button>
            ) : (
              <Button
                type="button"
                variant="secondary"
                className="h-10 cursor-pointer rounded-lg px-5 sm:min-w-24"
                onClick={() => onOpenChange(false)}
              >
                Close
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(nextOpen) => {
          if (!nextOpen && !deleting) setDeleteTarget(null);
        }}
        title="Delete client?"
        description={`${deleteTarget?.name ?? "This client"} will be removed from the shared source.`}
        onConfirm={() => void confirmDelete()}
        loading={deleting}
      />
    </>
  );
}
