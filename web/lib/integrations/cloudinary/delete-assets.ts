export type CloudinaryDeleteAsset = {
  public_id?: string | null;
  resource_type?: "image" | "video" | "raw" | string | null;
};

export async function deleteCloudinaryAssets(items: CloudinaryDeleteAsset[]) {
  const deleteItems = items
    .filter((item) => item.public_id)
    .map((item) => ({
      public_id: item.public_id,
      resource_type: item.resource_type || "image",
    }));

  if (!deleteItems.length) return;

  const response = await fetch("/api/cloudinary/delete", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ items: deleteItems }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => null);
    throw new Error(error?.error || "Cloudinary delete failed");
  }
}
