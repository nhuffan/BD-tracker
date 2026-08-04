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
      <DialogContent className="max-h-[96vh] w-[min(1120px,96vw)] max-w-[96vw] overflow-hidden p-3 sm:max-w-[96vw]">
        <DialogTitle className="sr-only">Hình ảnh minh chứng giao dịch</DialogTitle>
        {imageUrl && (
          <img
            src={imageUrl}
            alt="Hình ảnh minh chứng giao dịch"
            className="max-h-[90vh] w-full rounded-md object-contain"
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
