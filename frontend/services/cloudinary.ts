import { api } from "./api";

type UploadSignature = {
  cloud_name: string;
  api_key: string;
  timestamp: number;
  signature: string;
};

export type UploadedMedia = {
  id: string;
  url: string;
  resource_type: "image" | "video" | "raw";
  mime_type?: string;
  size_bytes?: number;
  width?: number;
  height?: number;
  duration_seconds?: number;
  public_id?: string;
};

function resourceType(file: File): UploadedMedia["resource_type"] {
  if (file.type.startsWith("image/")) return "image";
  if (file.type.startsWith("video/") || file.type.startsWith("audio/")) return "video";
  return "raw";
}

export async function uploadMedia(file: File, token: string): Promise<UploadedMedia> {
  const type = resourceType(file);
  const signature = await api<UploadSignature>("/media/upload-signature", { method: "POST", token });
  const form = new FormData();
  form.append("file", file);
  form.append("api_key", signature.api_key);
  form.append("timestamp", String(signature.timestamp));
  form.append("signature", signature.signature);

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${encodeURIComponent(signature.cloud_name)}/${type}/upload`,
    { method: "POST", body: form },
  );
  const body = await response.json().catch(() => ({}));
  if (!response.ok || !body.secure_url) {
    throw new Error(body.error?.message ?? "Upload Cloudinary impossible.");
  }

  const result = await api<{ media: UploadedMedia }>("/media/complete", {
    method: "POST",
    token,
    body: JSON.stringify({
      public_id: body.public_id ?? null,
      url: body.secure_url,
      resource_type: type,
      mime_type: file.type || null,
      size_bytes: file.size,
      width: body.width ?? null,
      height: body.height ?? null,
      duration_seconds: body.duration ?? null,
    }),
  });
  return result.media;
}
