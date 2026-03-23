"use client";

import { useMemo, useState } from "react";
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
import type { QAPriority } from "../types";

const fieldClass =
  "h-11 w-full min-w-0 rounded-lg border border-input bg-background px-3 text-sm shadow-none";
const labelClass =
  "mb-2 block text-[11px] font-bold uppercase tracking-wide text-muted-foreground";

export default function CreateQATicketDialog({
  open,
  onOpenChange,
  bdMap,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bdMap: Record<string, string>;
  onSaved: () => void;
}) {
  const [askedByBdId, setAskedByBdId] = useState("");
  const [title, setTitle] = useState("");
  const [issueDetail, setIssueDetail] = useState("");
  const [priority, setPriority] = useState<QAPriority>("medium");
  const [saving, setSaving] = useState(false);

  const bdOptions = useMemo(() => {
    return Object.entries(bdMap)
      .map(([id, label]) => ({ id, label }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [bdMap]);

  const isDisabled = !askedByBdId || !title.trim() || saving;

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
      onOpenChange(false);
      onSaved();
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          className="w-[66vw] max-w-none min-w-[900px] gap-0 overflow-hidden rounded-xl border bg-background p-0 shadow-xl"
        >

        <DialogHeader className="border-b px-6 py-5">
          <DialogTitle className="text-2xl font-bold tracking-tight text-foreground">
            Submit a New Question
          </DialogTitle>
          <DialogDescription className="mt-1 text-sm text-muted-foreground">
            Please provide details regarding your inquiry.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 px-6 py-6">
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