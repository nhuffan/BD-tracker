import { NextResponse } from "next/server";
import { cloudinary } from "@/lib/cloudinary";

export const runtime = "nodejs";

type DeleteItem = {
  public_id?: string;
  resource_type?: "image" | "video" | "raw";
};

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const items: DeleteItem[] = Array.isArray(body?.items)
      ? body.items
      : body?.public_id
        ? [
            {
              public_id: body.public_id,
              resource_type: body.resource_type,
            },
          ]
        : [];

    if (!items.length) {
      return NextResponse.json(
        { error: "No files provided" },
        { status: 400 }
      );
    }

    const results = await Promise.all(
      items
        .filter((item) => item.public_id)
        .map(async (item) => {
          const result = await cloudinary.uploader.destroy(item.public_id!, {
            resource_type: item.resource_type || "image",
            invalidate: true,
          });

          return {
            public_id: item.public_id,
            resource_type: item.resource_type || "image",
            result,
          };
        })
    );

    return NextResponse.json({ results });
  } catch (error) {
    console.error("Cloudinary delete failed:", error);
    return NextResponse.json({ error: "Delete failed" }, { status: 500 });
  }
}