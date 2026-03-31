"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { UploadCloud, Trash2 } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { useMasters } from "@/lib/useMasters";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { AttachmentIcon, isImageFile } from "@/components/qa/utils/AttachmentIcon";
import {
  attachmentCardClass,
  interactiveCardClass,
  formatFileSize,
  truncateMiddleFileName,
  MAX_ATTACHMENTS,
  preprocessAttachmentFiles,
  getOversizedFiles,
} from "@/components/qa/utils/attachmentHelpers";
import AttachmentLoadingIndicator from "@/components/qa/utils/AttachmentLoadingIndicator";
import type { ApprovalImage } from "../utils/types";

const fieldClass =
  "!h-11 h-11 w-full min-w-0 rounded-lg border border-input bg-background px-3 text-sm shadow-none";

const infoFieldClass =
  "flex h-11 w-full min-w-0 items-center rounded-lg border border-input bg-muted/60 px-3 text-sm text-foreground";

const labelClass =
  "mb-2 block text-[11px] font-bold uppercase tracking-wide text-muted-foreground";

type LocalAttachment = ApprovalImage & {
  file?: File;
  local_preview_url?: string | null;
  upload_status?: "idle" | "uploading" | "uploaded" | "error";
};

function getLocalAttachmentOpenUrl(item: LocalAttachment) {
  return item.local_preview_url || item.secure_url || item.url || null;
}

function formatCreatedDate(value: Date) {
  return value.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function CreateApprovalRequestDialog({
  open,
  onOpenChange,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}) {
  const { items: bdList } = useMasters("bd");

  const [askedByBdId, setAskedByBdId] = useState("");
  const [storeName, setStoreName] = useState("");
  const [description, setDescription] = useState("");
  const [attachments, setAttachments] = useState<LocalAttachment[]>([]);
  const [saving, setSaving] = useState(false);
  const [submitStage, setSubmitStage] = useState<
    "idle" | "uploading_attachments" | "creating_request"
  >("idle");
  const [dragging, setDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const bdOptions = useMemo(() => {
    return [...bdList].sort((a, b) => a.label.localeCompare(b.label));
  }, [bdList]);
  const [createdAtText, setCreatedAtText] = useState("");
  const isDisabled = !askedByBdId || !storeName.trim() || saving;

  async function mergeFiles(fileList: FileList | File[]) {
    const rawFiles = Array.from(fileList);

    const processedFiles = await preprocessAttachmentFiles(rawFiles, isImageFile);

    const oversizedFiles = getOversizedFiles(rawFiles);
    if (oversizedFiles.length > 0) {
      alert(
        oversizedFiles.map((file) => `${file.name} exceeds the 10MB limit.`).join("\n")
      );
    }

    setAttachments((prev) => {
      const existing = new Set(
        prev.map((item) => `${item.name}-${item.size}-${item.type}`)
      );

      const remain = MAX_ATTACHMENTS - prev.length;
      if (remain <= 0) return prev;

      const next: LocalAttachment[] = processedFiles
        .filter((file) => {
          const key = `${file.name}-${file.size}-${file.type}`;
          return !existing.has(key);
        })
        .slice(0, remain)
        .map((file) => ({
          id: crypto.randomUUID(),
          name: file.name,
          size: file.size,
          type: file.type || "application/octet-stream",
          resource_type: "raw",
          public_id: "",
          url: "",
          secure_url: "",
          format: null,
          version: null,
          thumbnail_url: null,
          local_preview_url: URL.createObjectURL(file),
          file,
          upload_status: "idle",
        }));

      return [...prev, ...next];
    });
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (!e.target.files?.length) return;
    await mergeFiles(e.target.files);
    e.target.value = "";
  }

  function handleRemoveAttachment(id: string) {
    setAttachments((prev) => {
      const target = prev.find((item) => item.id === id);
      if (target?.local_preview_url) URL.revokeObjectURL(target.local_preview_url);
      return prev.filter((item) => item.id !== id);
    });
  }

  useEffect(() => {
    if (open) return;

    attachments.forEach((item) => {
      if (item.local_preview_url) URL.revokeObjectURL(item.local_preview_url);
    });

    setAskedByBdId("");
    setStoreName("");
    setDescription("");
    setAttachments([]);
    setDragging(false);
    setSaving(false);
    setSubmitStage("idle");
  }, [open]);

  useEffect(() => {
    if (!open) return;
    setCreatedAtText(formatCreatedDate(new Date()));
  }, [open]);

  async function uploadAttachments(files: LocalAttachment[]) {
    const formData = new FormData();

    files.forEach((item) => {
      if (item.file) {
        formData.append("files", item.file);
      }
    });

    formData.append("folder", "approval_requests");

    const res = await fetch("/api/cloudinary/upload", {
      method: "POST",
      body: formData,
    });

    if (!res.ok) {
      throw new Error("Failed to upload attachments");
    }

    const data = await res.json();
    return data.files as ApprovalImage[];
  }

  async function handleSave() {
    if (isDisabled) return;

    setSaving(true);
    setSubmitStage("idle");

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      let uploadedAttachments: ApprovalImage[] = [];

      if (attachments.length > 0) {
        setSubmitStage("uploading_attachments");
        uploadedAttachments = await uploadAttachments(attachments);
      }

      setSubmitStage("creating_request");

      const payload = {
        asked_by_bd_id: askedByBdId,
        created_by_user_id: user?.id ?? null,
        store_name: storeName.trim(),
        user_note: description.trim() || null,
        images: uploadedAttachments,
        status: "pending",
      };

      const { error } = await supabase.from("approval_requests").insert(payload);

      if (error) {
        console.error("Failed to create approval request:", error);
        alert(error.message);
        return;
      }

      attachments.forEach((item) => {
        if (item.local_preview_url) URL.revokeObjectURL(item.local_preview_url);
      });

      onOpenChange(false);
      onSaved();
    } finally {
      setSaving(false);
      setSubmitStage("idle");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="flex max-h-[90vh] w-[66vw] max-w-none min-w-[900px] flex-col overflow-hidden rounded-xl border bg-background p-0 shadow-xl"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <DialogHeader className="border-b px-6 py-4">
          <DialogTitle className="text-2xl font-bold tracking-tight text-foreground">
            Create Approval Request
          </DialogTitle>
          <DialogDescription className="mt-1 text-sm text-muted-foreground">
            Submit store visit evidence for admin review.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 space-y-4 overflow-y-auto px-6 ">
          <div>
            <label className={labelClass}>Store Name</label>
            <Input
              value={storeName}
              onChange={(e) => setStoreName(e.target.value)}
              placeholder="Enter store name"
              className={fieldClass}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="w-full min-w-0">
              <label className={labelClass}>BD Name</label>
              <Select value={askedByBdId} onValueChange={setAskedByBdId}>
                <SelectTrigger className={fieldClass}>
                  <SelectValue placeholder="Select BD" />
                </SelectTrigger>
                <SelectContent>
                  {bdOptions.map((item) => (
                    <SelectItem key={item.id} value={item.id}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="w-full min-w-0">
              <label className={labelClass}>Created At</label>
              <div className={infoFieldClass}>{createdAtText || "—"}</div>
            </div>
          </div>

          <div>
            <label className={labelClass}>Description (optional)</label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add request details for admin..."
              className="min-h-[60px] whitespace-pre-wrap break-all"
            />
          </div>

          <div>
            <label className={labelClass}>Attachments (optional)</label>

            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="
                image/*,
                video/*,
                .mp4,.mov,.webm,.m4v,
                .pdf,
                .txt,
                .doc,.docx,
                .xls,.xlsx,
                .ppt,.pptx,
                application/msword,
                application/vnd.openxmlformats-officedocument.wordprocessingml.document,
                application/vnd.ms-excel,
                application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,
                application/vnd.ms-powerpoint,
                application/vnd.openxmlformats-officedocument.presentationml.presentation,
                video/mp4,
                video/quicktime,
                video/webm,
                video/x-m4v
              "
              className="hidden"
              onChange={handleFileChange}
            />

            {attachments.length === 0 ? (
              <div
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragging(true);
                }}
                onDragLeave={() => setDragging(false)}
                onDrop={async (e) => {
                  e.preventDefault();
                  setDragging(false);
                  if (e.dataTransfer.files?.length) {
                    await mergeFiles(e.dataTransfer.files);
                  }
                }}
                style={{
                  border: dragging
                    ? "1.5px dashed var(--primary)"
                    : "1.5px dashed color-mix(in oklab, var(--primary) 22%, transparent)",
                  borderRadius: "10px",
                }}
                className={`flex min-h-[60px] w-full flex-col items-center justify-center px-5 py-5 text-center ${interactiveCardClass}`}
              >
                <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <UploadCloud className="h-5 w-5" />
                </div>

                <div className="text-sm font-semibold text-foreground">
                  Click to upload or drag and drop
                </div>

                <div className="mt-1 text-xs text-muted-foreground">
                  Up to {MAX_ATTACHMENTS} attachments · Max. 10MB each
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                {attachments.map((item) => {
                  const isImage = isImageFile(item.type);

                  return (
                    <div
                      key={item.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => {
                        const targetUrl = getLocalAttachmentOpenUrl(item);
                        if (targetUrl) {
                          window.open(targetUrl, "_blank", "noopener,noreferrer");
                        }
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          const targetUrl = getLocalAttachmentOpenUrl(item);
                          if (targetUrl) {
                            window.open(targetUrl, "_blank", "noopener,noreferrer");
                          }
                        }
                      }}
                      className={`${attachmentCardClass} ${interactiveCardClass} text-left`}
                      title={item.name}
                    >
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveAttachment(item.id);
                        }}
                        className="absolute right-2 top-1/2 z-10 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground transition hover:bg-muted hover:text-foreground"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>

                      {isImage && item.local_preview_url ? (
                        <img
                          src={item.local_preview_url}
                          alt={item.name}
                          className="h-10 w-10 shrink-0 rounded-lg object-cover"
                        />
                      ) : (
                        <AttachmentIcon
                          type={item.type}
                          name={item.name}
                          className="h-10 w-10 shrink-0"
                        />
                      )}

                      <div className="min-w-0 flex-1 overflow-hidden pr-1">
                        <div className="overflow-hidden text-sm font-medium text-foreground">
                          {truncateMiddleFileName(item.name)}
                        </div>
                        <div className="mt-1 text-xs text-muted-foreground">
                          {formatFileSize(item.size)}
                        </div>
                      </div>
                    </div>
                  );
                })}

                {attachments.length < MAX_ATTACHMENTS && (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    style={{
                      border: dragging
                        ? "1.5px dashed var(--primary)"
                        : "1.5px dashed color-mix(in oklab, var(--primary) 22%, transparent)",
                      borderRadius: "10px",
                    }}
                    className={`flex h-[72px] min-h-[72px] w-full items-center justify-center rounded-lg border border-input bg-background px-3 py-2 text-sm font-medium text-muted-foreground ${interactiveCardClass}`}
                  >
                    + Add more
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="border-t px-6 py-4">
          <div className="flex h-11 flex-1 items-center">
            <div className="flex min-h-[44px] flex-1 items-center">
              {saving && (
                <AttachmentLoadingIndicator
                  text={
                    submitStage === "uploading_attachments"
                      ? `Uploading ${attachments.length} file${attachments.length > 1 ? "s" : ""}...`
                      : "Submitting request..."
                  }
                />
              )}
            </div>

            <div className="flex shrink-0 items-center gap-3">
              <Button
                type="button"
                variant="ghost"
                className="h-11 cursor-pointer rounded-lg px-5"
                onClick={() => onOpenChange(false)}
                disabled={saving}
              >
                Cancel
              </Button>

              <Button
                type="button"
                className="h-11 cursor-pointer rounded-lg px-6"
                onClick={handleSave}
                disabled={isDisabled}
              >
                Submit Request
              </Button>
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}