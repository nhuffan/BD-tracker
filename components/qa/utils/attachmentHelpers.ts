export const attachmentCardClass =
  "relative flex h-[72px] min-h-[72px] w-full min-w-0 items-center gap-3 overflow-hidden rounded-lg border border-input bg-background px-3 py-2 pr-[42px]";

export const interactiveCardClass =
  "group cursor-pointer transition-all duration-150 hover:border-primary/40 hover:bg-muted/50 hover:shadow-sm active:scale-[0.98]";

export const MAX_ATTACHMENTS = 4;
export const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;
export const MAX_IMAGE_SIZE_BYTES = 512 * 1024;

export function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function truncateMiddleFileName(name: string, maxBaseLength = 36) {
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

export async function compressImageFile(
  file: File,
  maxBytes = MAX_IMAGE_SIZE_BYTES
): Promise<File> {
  if (!file.type.startsWith("image/")) return file;
  if (file.size <= maxBytes) return file;

  const imageBitmap = await createImageBitmap(file);

  let width = imageBitmap.width;
  let height = imageBitmap.height;

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");

  if (!ctx) {
    imageBitmap.close();
    return file;
  }

  let quality = 0.9;
  let outputBlob: Blob | null = null;

  while (quality >= 0.4) {
    canvas.width = width;
    canvas.height = height;

    ctx.clearRect(0, 0, width, height);
    ctx.drawImage(imageBitmap, 0, 0, width, height);

    outputBlob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", quality)
    );

    if (outputBlob && outputBlob.size <= maxBytes) {
      break;
    }

    quality -= 0.1;

    if (quality < 0.6) {
      width = Math.max(800, Math.floor(width * 0.9));
      height = Math.max(800, Math.floor(height * 0.9));
    }
  }

  imageBitmap.close();

  if (!outputBlob || outputBlob.size > maxBytes) return file;

  const compressedName = file.name.replace(/\.\w+$/, ".jpg");

  return new File([outputBlob], compressedName, {
    type: "image/jpeg",
    lastModified: Date.now(),
  });
}

export async function preprocessAttachmentFiles(
  files: File[],
  isImageFile: (type: string) => boolean
): Promise<File[]> {
  const processedFiles = await Promise.all(
    files.map(async (file) => {
      if (isImageFile(file.type)) {
        return compressImageFile(file);
      }
      return file;
    })
  );

  return processedFiles.filter((file) => file.size <= MAX_FILE_SIZE_BYTES);
}

export function getOversizedFiles(files: File[]) {
  return files.filter((file) => file.size > MAX_FILE_SIZE_BYTES);
}