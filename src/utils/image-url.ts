export function buildImageUrl(imagePath?: string | null): string {
  if (!imagePath) return "";

  if (
    imagePath.startsWith("http://") ||
    imagePath.startsWith("https://")
  ) {
    return imagePath;
  }

  const bucket = (import.meta.env.VITE_MINIO_BUCKET || "lojapod").replace(/['"]/g, "").trim();
  const publicUrl = (import.meta.env.VITE_MINIO_PUBLIC_URL || "https://bucket-production-10ac.up.railway.app").replace(/['"]/g, "").trim().replace(/\/$/, "");
  const cleanPath = imagePath.replace(/^\//, "");

  if (!bucket) {
    return `${publicUrl}/${cleanPath}`;
  }

  return `${publicUrl}/${bucket}/${cleanPath}`;
}
