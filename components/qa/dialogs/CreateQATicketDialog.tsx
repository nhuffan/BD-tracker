"use client";

import { useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
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
import type { QAPriority } from "../types";

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
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold tracking-tight">
            Create Question
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <p className="mb-1.5 text-sm font-medium">Asked by</p>
            <Select value={askedByBdId} onValueChange={setAskedByBdId}>
              <SelectTrigger>
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

          <div>
            <p className="mb-1.5 text-sm font-medium">Title</p>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter issue title"
            />
          </div>

          <div>
            <p className="mb-1.5 text-sm font-medium">Issue detail</p>
            <textarea
              value={issueDetail}
              onChange={(e) => setIssueDetail(e.target.value)}
              placeholder="Describe the issue..."
              className="min-h-[120px] w-full rounded-md border bg-background px-3 py-2 text-sm outline-none"
            />
          </div>

          <div>
            <p className="mb-1.5 text-sm font-medium">Priority</p>
            <Select
              value={priority}
              onValueChange={(value) => setPriority(value as QAPriority)}
            >
              <SelectTrigger>
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

        <DialogFooter>
          <Button
            variant="secondary"
            className="cursor-pointer"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>

          <Button
            className="cursor-pointer"
            onClick={handleSave}
            disabled={isDisabled}
          >
            {saving ? "Saving..." : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}