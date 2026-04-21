import { Loader2 } from "lucide-react";

export default function AttachmentLoadingIndicator({
  text,
  className = "",
}: {
  text: string;
  className?: string;
}) {
  return (
    <div
      className={`flex items-center gap-2 text-sm font-medium text-primary ${className}`}
    >
      <Loader2
        className="h-4 w-4"
        style={{ animation: "spin 1s linear infinite" }}
      />
      <span>{text}</span>
    </div>
  );
}