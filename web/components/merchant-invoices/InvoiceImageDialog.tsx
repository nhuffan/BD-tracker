"use client";

import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";

export default function InvoiceImageDialog({
  imageUrl,
  onOpenChange,
}: {
  imageUrl: string | null;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={!!imageUrl} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] max-w-[92vw] overflow-hidden p-3">
        <DialogTitle className="sr-only">Hình ảnh minh chứng giao dịch</DialogTitle>
        {imageUrl && (
          <img
            src={imageUrl}
            alt="Hình ảnh minh chứng giao dịch"
            className="max-h-[84vh] w-full rounded-md object-contain"
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
