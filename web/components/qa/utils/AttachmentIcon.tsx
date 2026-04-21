import {
  File,
  FileText,
  FileImage,
  FileVideo,
  FileSpreadsheet,
  FileArchive,
  FileCode2,
  Presentation,
} from "lucide-react";

export function isImageFile(type: string) {
  return type.startsWith("image/");
}

export function isVideoFile(type: string, name: string) {
  return type.startsWith("video/") || /\.(mp4|mov|webm|m4v)$/i.test(name);
}

export function isPdfFile(type: string, name: string) {
  return type === "application/pdf" || name.toLowerCase().endsWith(".pdf");
}

export function isWordFile(type: string, name: string) {
  return (
    type === "application/msword" ||
    type ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    /\.(doc|docx)$/i.test(name)
  );
}

export function isExcelFile(type: string, name: string) {
  return (
    type === "application/vnd.ms-excel" ||
    type ===
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
    /\.(xls|xlsx|csv)$/i.test(name)
  );
}

export function isPowerPointFile(type: string, name: string) {
  return (
    type === "application/vnd.ms-powerpoint" ||
    type ===
      "application/vnd.openxmlformats-officedocument.presentationml.presentation" ||
    /\.(ppt|pptx)$/i.test(name)
  );
}

export function isTextFile(type: string, name: string) {
  return type.startsWith("text/") || /\.(txt|md|json|xml|yml|yaml)$/i.test(name);
}

export function AttachmentIcon({
  type,
  name,
  className,
}: {
  type: string;
  name: string;
  className?: string;
}) {
  const wrap = "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted";
  const iconClass = "h-5 w-5 text-muted-foreground";

  if (isImageFile(type)) {
    return (
      <div className={wrap}>
        <FileImage className={iconClass} />
      </div>
    );
  }

  if (isVideoFile(type, name)) {
    return (
      <div className={wrap}>
        <FileVideo className={iconClass} />
      </div>
    );
  }

  if (isPdfFile(type, name)) {
    return (
      <div className={wrap}>
        <FileText className={iconClass} />
      </div>
    );
  }

  if (isWordFile(type, name)) {
    return (
      <div className={wrap}>
        <FileCode2 className={iconClass} />
      </div>
    );
  }

  if (isExcelFile(type, name)) {
    return (
      <div className={wrap}>
        <FileSpreadsheet className={iconClass} />
      </div>
    );
  }

  if (isPowerPointFile(type, name)) {
    return (
      <div className={wrap}>
        <Presentation className={iconClass} />
      </div>
    );
  }

  if (isTextFile(type, name)) {
    return (
      <div className={wrap}>
        <FileArchive className={iconClass} />
      </div>
    );
  }

  return (
    <div className={wrap}>
      <File className={iconClass} />
    </div>
  );
}