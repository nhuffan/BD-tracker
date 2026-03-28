"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { File, FileText, Image as ImageIcon, UploadCloud, Trash2 } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
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
import type { QAPriority, QATicketAttachment } from "../types";
import { useMasters } from "@/lib/useMasters";

const fieldClass =
  "h-11 w-full min-w-0 rounded-lg border border-input bg-background px-3 text-sm shadow-none";

const labelClass =
  "mb-2 block text-[11px] font-bold uppercase tracking-wide text-muted-foreground";

const attachmentCardClass =
  "relative flex h-[72px] min-h-[72px] w-full min-w-0 items-center gap-3 overflow-hidden rounded-lg border border-input bg-background px-3 py-2 pr-[42px]";

const MAX_ATTACHMENTS = 4;

type LocalAttachment = QATicketAttachment & {
  file: File;
};

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function isImageFile(type: string) {
  return type.startsWith("image/");
}

function isPdfFile(type: string, name: string) {
  return type === "application/pdf" || name.toLowerCase().endsWith(".pdf");
}

function truncateMiddleFileName(name: string, maxBaseLength = 30) {
  const lastDot = name.lastIndexOf(".");

  if (lastDot <= 0 || lastDot === name.length - 1) {
    if (name.length <= maxBaseLength) return name;
    const keep = Math.max(6, Math.floor((maxBaseLength - 3) / 2));
    return `${name.slice(0, keep)}...${name.slice(-keep)}`;
  }

  const base = name.slice(0, lastDot);
  const ext = name.slice(lastDot);

  if (base.length <= maxBaseLength) return name;

  const front = Math.max(8, Math.ceil((maxBaseLength - 3) / 2));
  const back = Math.max(5, Math.floor((maxBaseLength - 3) / 2));

  return `${base.slice(0, front)}...${base.slice(-back)}${ext}`;
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
  const { items: bdList } = useMasters("bd");
  const [attachments, setAttachments] = useState<LocalAttachment[]>([]);
  const [dragging, setDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const bdOptions = useMemo(() => {
    return [...bdList].sort((a, b) => a.label.localeCompare(b.label));
  }, [bdList]);

  const isDisabled = !askedByBdId || !title.trim() || saving;

  function mergeFiles(fileList: FileList | File[]) {
    const files = Array.from(fileList);

    setAttachments((prev) => {
      const existing = new Set(
        prev.map((item) => `${item.name}-${item.size}-${item.type}`)
      );

      const remain = MAX_ATTACHMENTS - prev.length;
      if (remain <= 0) return prev;

      const next = files
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
          preview_url: isImageFile(file.type) ? URL.createObjectURL(file) : null,
          file,
        }));

      return [...prev, ...next];
    });
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (!e.target.files?.length) return;
    mergeFiles(e.target.files);
    e.target.value = "";
  }

  function handleRemoveAttachment(id: string) {
    setAttachments((prev) => {
      const target = prev.find((item) => item.id === id);
      if (target?.preview_url) URL.revokeObjectURL(target.preview_url);
      return prev.filter((item) => item.id !== id);
    });
  }

  useEffect(() => {
    if (open) return;

    attachments.forEach((item) => {
      if (item.preview_url) URL.revokeObjectURL(item.preview_url);
    });
    setAttachments([]);
    setDragging(false);
  }, [open]);

  async function handleSave() {
    if (isDisabled) return;

    setSaving(true);
    try {
      const payload = {
        asked_by_bd_id: askedByBdId,
        title: title.trim(),
        issue_detail: issueDetail.trim() || null,
        priority,
      };

      const { error } = await supabase.from("qa_tickets").insert(payload);

      if (error) {
        console.error("Failed to create qa ticket:", error);
        alert(error.message);
        return;
      }

      setAskedByBdId("");
      setTitle("");
      setIssueDetail("");
      setPriority("medium");
      console.log("attachments ui only:", attachments);
      attachments.forEach((item) => {
        if (item.preview_url) URL.revokeObjectURL(item.preview_url);
      });
      setAttachments([]);
      onOpenChange(false);
      onSaved();
    } finally {
      setSaving(false);
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
            Submit a New Question
          </DialogTitle>
          <DialogDescription className="mt-1 text-sm text-muted-foreground">
            Please provide details regarding your inquiry.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 space-y-4 overflow-y-auto px-6">
          <div>
            <label className={labelClass}>Subject / Title</label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Issue with point calculation"
              className={fieldClass}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="w-full min-w-0">
              <label className={labelClass}>Asked by</label>
              <Select value={askedByBdId} onValueChange={setAskedByBdId}>
                <SelectTrigger className={fieldClass}>
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
            </div>

            <div className="w-full min-w-0">
              <label className={labelClass}>Priority level</label>
              <Select
                value={priority}
                onValueChange={(value) => setPriority(value as QAPriority)}
              >
                <SelectTrigger className={fieldClass}>
                  <SelectValue placeholder="Select priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <label className={labelClass}>Detailed description</label>
            <Textarea
              wrap="soft"
              value={issueDetail}
              onChange={(e) => setIssueDetail(e.target.value)}
              placeholder="Describe your question or issue in detail..."
              className="min-h-[140px] whitespace-pre-wrap break-all"
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
                application/vnd.openxmlformats-officedocument.presentationml.presentation
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
                onDrop={(e) => {
                  e.preventDefault();
                  setDragging(false);
                  if (e.dataTransfer.files?.length) {
                    mergeFiles(e.dataTransfer.files);
                  }
                }}
                style={{
                  border: dragging
                    ? "1.5px dashed var(--primary)"
                    : "1.5px dashed color-mix(in oklab, var(--primary) 22%, transparent)",
                  borderRadius: "10px",
                }}
                className="flex min-h-[60px] w-full cursor-pointer flex-col items-center justify-center bg-background px-5 py-5 text-center"
              >
                <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <UploadCloud className="h-5 w-5" />
                </div>

                <div className="text-sm font-semibold text-foreground">
                  Click to upload or drag and drop
                </div>

                <div className="mt-1 text-xs text-muted-foreground">
                  PDF, PNG, JPG (Max. 10MB)
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                {attachments.map((item) => {
                  const isImage = isImageFile(item.type);
                  const isPdf = isPdfFile(item.type, item.name);

                  return (
                    <div key={item.id} className={attachmentCardClass}>
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

                      {isImage && item.preview_url ? (
                        <img
                          src={item.preview_url}
                          alt={item.name}
                          className="h-10 w-10 shrink-0 rounded object-cover"
                        />
                      ) : (
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded bg-muted">
                          {isPdf ? (
                            <FileText className="h-5 w-5 text-red-500" />
                          ) : (
                            <File className="h-5 w-5 text-blue-500" />
                          )}
                        </div>
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
                    className="flex h-[72px] min-h-[72px] w-full items-center justify-center bg-background px-3 py-2 text-sm font-medium text-muted-foreground transition hover:text-foreground"
                  >
                    + Add more
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="flex-row items-center justify-end gap-3 border-t px-6 py-4">
          <Button
            type="button"
            variant="ghost"
            className="h-11 rounded-lg px-5 cursor-pointer"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>

          <Button
            type="button"
            className="h-11 rounded-lg px-6 cursor-pointer"
            onClick={handleSave}
            disabled={isDisabled}
          >
            {saving ? "Submitting..." : "Submit Question"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}