import { NextResponse } from "next/server";
import { cloudinary } from "@/lib/cloudinary";

export const runtime = "nodejs";

function bufferToDataUri(file: File, buffer: Buffer) {
  return `data:${file.type};base64,${buffer.toString("base64")}`;
}

function getExtension(name: string) {
  const i = name.lastIndexOf(".");
  return i > 0 ? name.slice(i + 1).toLowerCase() : "";
}

function getBaseName(name: string) {
  const i = name.lastIndexOf(".");
  return i > 0 ? name.slice(0, i) : name;
}

function normalizeName(name: string) {
  return name
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .toLowerCase();
}

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const files = formData.getAll("files") as File[];

    if (!files.length) {
      return NextResponse.json({ error: "No files provided" }, { status: 400 });
    }

    const uploaded = await Promise.all(
      files.map(async (file) => {
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        const ext = getExtension(file.name);
        const base = normalizeName(getBaseName(file.name));

        const isImageOrVideo =
          file.type.startsWith("image/") || file.type.startsWith("video/");

        const publicId = isImageOrVideo
          ? base
          : ext
            ? `${base}.${ext}`
            : base;

        const result = await cloudinary.uploader.upload(
          bufferToDataUri(file, buffer),
          {
            folder: "qa_tickets",
            resource_type: "auto",
            public_id: publicId,
            use_filename: false,
            unique_filename: true,
            overwrite: false,
          }
        );

        const isImage = result.resource_type === "image";

        return {
          id: result.asset_id,
          name: file.name,
          size: file.size,
          type: file.type || "application/octet-stream",
          resource_type: result.resource_type as "image" | "video" | "raw",
          public_id: result.public_id,
          url: result.url,
          secure_url: result.secure_url,
          format: result.format ?? null,
          version: result.version ?? null,
          thumbnail_url: isImage
            ? cloudinary.url(result.public_id, {
                secure: true,
                width: 80,
                height: 80,
                crop: "fill",
                quality: "auto",
                fetch_format: "auto",
              })
            : null,
        };
      })
    );

    return NextResponse.json({ files: uploaded });
  } catch (error) {
    console.error("Cloudinary upload failed:", error);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}