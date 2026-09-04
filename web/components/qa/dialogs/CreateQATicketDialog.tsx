"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { UploadCloud, Trash2 } from "lucide-react";
import { AttachmentIcon, isImageFile } from "@/components/qa/utils/AttachmentIcon";
import { supabase } from "@/lib/integrations/supabase/client";
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
import type { QAPriority, QATicketAttachment } from "../utils/types";
import { useMastersActive } from "@/lib/features/masters/useMasters";
import {
  attachmentCardClass,
  interactiveCardClass,
  formatFileSize,
  truncateMiddleFileName,
  MAX_ATTACHMENTS,
  preprocessAttachmentFiles,
  getOversizedFiles,
} from "../utils/attachmentHelpers";
import AttachmentLoadingIndicator from "../utils/AttachmentLoadingIndicator";
import { toast } from "sonner";
import { QAFormField, QAFormSection, QAPriorityOption } from "./QAFormUI";

type LocalAttachment = QATicketAttachment & {
  file?: File;
  local_preview_url?: string | null;
  upload_status?: "idle" | "uploading" | "uploaded" | "error";
};

function getLocalAttachmentOpenUrl(item: LocalAttachment) {
  return item.local_preview_url || item.secure_url || item.url || null;
}

export default function CreateQATicketDialog({
  open,
  onOpenChange,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}) {
  const [askedByBdId, setAskedByBdId] = useState("");
  const [title, setTitle] = useState("");
  const [issueDetail, setIssueDetail] = useState("");
  const [priority, setPriority] = useState<QAPriority>("medium");
  const [saving, setSaving] = useState(false);
  const [submitStage, setSubmitStage] = useState<
    "idle" | "uploading_attachments" | "creating_ticket"
  >("idle");
  const bdList = useMastersActive("bd");
  const [attachments, setAttachments] = useState<LocalAttachment[]>([]);
  const [dragging, setDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const bdOptions = useMemo(() => {
    return [...bdList].sort((a, b) => a.label.localeCompare(b.label));
  }, [bdList]);
  const isDisabled = !askedByBdId || !title.trim() || saving;

  async function mergeFiles(fileList: FileList | File[]) {
    const rawFiles = Array.from(fileList);

    const processedFiles = await preprocessAttachmentFiles(
      rawFiles,
      isImageFile
    );

    const oversizedFiles = getOversizedFiles(rawFiles);
    if (oversizedFiles.length > 0) {
      toast.error(
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
        .map((file): LocalAttachment => ({
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

    setAttachments((prev) => {
      prev.forEach((item) => {
        if (item.local_preview_url) URL.revokeObjectURL(item.local_preview_url);
      });
      return [];
    });
    setDragging(false);
  }, [open]);

  async function uploadAttachments(files: LocalAttachment[]) {
    const formData = new FormData();

    files.forEach((item) => {
      if (item.file) {
        formData.append("files", item.file);
      }
    });

    const res = await fetch("/api/cloudinary/upload", {
      method: "POST",
      body: formData,
    });

    if (!res.ok) {
      throw new Error("Failed to upload attachments");
    }

    const data = await res.json();
    return data.files as QATicketAttachment[];
  }

  async function handleSave() {
    if (isDisabled) return;

    setSaving(true);
    setSubmitStage("idle");

    try {
      let uploadedAttachments: QATicketAttachment[] = [];

      if (attachments.length > 0) {
        setSubmitStage("uploading_attachments");
        uploadedAttachments = await uploadAttachments(attachments);
      }

      setSubmitStage("creating_ticket");

      const payload = {
        asked_by_bd_id: askedByBdId,
        title: title.trim(),
        issue_detail: issueDetail.trim() || null,
        priority,
        attachments: uploadedAttachments,
      };

      const { error } = await supabase.from("qa_tickets").insert(payload);

      if (error) {
        console.error("Failed to create qa ticket:", error);
        toast.error(error.message || "Failed to create ticket.");
        return;
      }

      setAskedByBdId("");
      setTitle("");
      setIssueDetail("");
      setPriority("medium");
      attachments.forEach((item) => {
        if (item.local_preview_url) URL.revokeObjectURL(item.local_preview_url);
      });
      setAttachments([]);
      toast.success("Ticket created successfully.");
      onOpenChange(false);
      onSaved();
    } finally {
      setSaving(false);
      setSubmitStage("idle");
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (saving) return;
        onOpenChange(nextOpen);
      }}
    >
      <DialogContent
        className="max-h-[92dvh] grid-rows-[auto_minmax(0,1fr)_auto] gap-0 overflow-hidden p-0 sm:max-w-4xl"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <DialogHeader className="border-b bg-card px-5 py-4 pr-12 sm:px-6 sm:py-5">
          <DialogTitle className="text-xl font-semibold tracking-tight">
            Create a new ticket
          </DialogTitle>
          <DialogDescription>
            Provide the details the team needs to review and resolve this ticket.
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 space-y-4 overflow-y-auto bg-muted/25 px-4 py-4 sm:px-6 sm:py-5">
          <QAFormSection
            step={1}
            title="Ticket details"
            description="Give the ticket a clear title, requester and priority."
          >
            <div className="space-y-4">
              <QAFormField id="qa-title" label="Subject / title">
                <Input
                  id="qa-title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g., Issue with point calculation"
                  className="h-10"
                />
              </QAFormField>

              <div className="grid gap-4 sm:grid-cols-2">
                <QAFormField label="Asked by">
                  <Select value={askedByBdId} onValueChange={setAskedByBdId}>
                    <SelectTrigger className="h-10 w-full data-[size=default]:h-10">
                      <SelectValue placeholder="Select BD" />
                    </SelectTrigger>
                    <SelectContent>
                      {bdOptions.map((bd) => (
                        <SelectItem key={bd.id} value={bd.id}>
                          {bd.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </QAFormField>

                <QAFormField label="Priority level">
                  <Select
                    value={priority}
                    onValueChange={(value) => setPriority(value as QAPriority)}
                  >
                    <SelectTrigger className="h-10 w-full data-[size=default]:h-10">
                      <SelectValue>
                        <QAPriorityOption priority={priority} />
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">
                        <QAPriorityOption priority="low" />
                      </SelectItem>
                      <SelectItem value="medium">
                        <QAPriorityOption priority="medium" />
                      </SelectItem>
                      <SelectItem value="high">
                        <QAPriorityOption priority="high" />
                      </SelectItem>
                      <SelectItem value="urgent">
                        <QAPriorityOption priority="urgent" />
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </QAFormField>
              </div>
            </div>
          </QAFormSection>

          <QAFormSection
            step={2}
            title="Description"
            description="Explain what happened, what you expected and any relevant context."
            optional
          >
            <Textarea
              id="qa-description"
              aria-label="Ticket description"
              rows={4}
              wrap="soft"
              value={issueDetail}
              onChange={(e) => setIssueDetail(e.target.value)}
              placeholder="Describe the ticket issue in detail..."
              className="min-h-[96px] resize-none whitespace-pre-wrap break-all"
            />
          </QAFormSection>

          <QAFormSection
            step={3}
            title="Attachments"
            description="Add screenshots or documents when they help explain the issue."
          >
            <QAFormField label="Files" optional>

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
                  Max. 10MB
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
                      className={`${attachmentCardClass} group cursor-pointer text-left transition-all duration-150 hover:border-primary/40 hover:bg-muted/50 hover:shadow-sm active:scale-[0.98]`}
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
                        <Trash2 className="h-4 w-4 cursor-pointer" />
                      </button>

                      {isImage && item.local_preview_url ? (
                        <img
                          src={item.local_preview_url}
                          alt={item.name}
                          className="h-10 w-10 shrink-0 rounded-lg object-cover"
                        />
                      ) : (
                        <AttachmentIcon type={item.type} name={item.name} />
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
            </QAFormField>
          </QAFormSection>
        </div>

        <DialogFooter className="border-t bg-card px-4 py-3 sm:px-6 sm:py-4">
          <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center">
            <div className="flex min-h-5 flex-1 items-center">
              {saving && (
                <AttachmentLoadingIndicator
                  text={
                    submitStage === "uploading_attachments"
                      ? `Uploading ${attachments.length} file${attachments.length > 1 ? "s" : ""}...`
                      : "Submitting ticket..."
                  }
                />
              )}
            </div>

            <div className="flex shrink-0 flex-col-reverse gap-2 sm:flex-row sm:items-center">
              <Button
                type="button"
                variant="secondary"
                className="h-10 cursor-pointer rounded-lg px-5 sm:min-w-24"
                onClick={() => onOpenChange(false)}
                disabled={saving}
              >
                Cancel
              </Button>

              <Button
                type="button"
                className="h-10 cursor-pointer rounded-lg px-6 sm:min-w-36"
                onClick={handleSave}
                disabled={isDisabled}
              >
                Submit ticket
              </Button>
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
