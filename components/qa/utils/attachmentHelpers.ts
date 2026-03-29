export const attachmentCardClass =
  "relative flex h-[72px] min-h-[72px] w-full min-w-0 items-center gap-3 overflow-hidden rounded-lg border border-input bg-background px-3 py-2 pr-[42px]";

export const interactiveCardClass =
  "group cursor-pointer transition-all duration-150 hover:border-primary/40 hover:bg-muted/50 hover:shadow-sm active:scale-[0.98]";

export function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function truncateMiddleFileName(name: string, maxBaseLength = 30) {
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