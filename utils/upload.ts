// utils/upload.ts (client)
// Kiểm MIME + size (5MB) và đính kèm metadata.size khi upload lên Supabase Storage.

import { supabase } from "@/lib/supabase";

const BUCKET = "property-images";

// Cho phép JPG/PNG/WEBP, tối đa 5MB (đồng bộ với RLS trên DB)
const ALLOWED_MIME = ["image/jpeg", "image/png", "image/webp"] as const;
const ALLOWED_EXT = ["jpg", "jpeg", "png", "webp"] as const;
const MAX_BYTES = 5 * 1024 * 1024;

const MIME_TO_EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

const EXT_TO_MIME: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
};

function getExtFromName(name: string): string {
  const parts = (name || "").split(".");
  return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : "";
}

function pickMime(file: File): string {
  // Ưu tiên MIME do browser cung cấp; nếu rỗng, suy từ đuôi.
  if (file.type) return file.type;
  const ext = getExtFromName(file.name);
  return EXT_TO_MIME[ext] || "";
}

function ensureAllowed(file: File) {
  const mime = pickMime(file);
  const ext = getExtFromName(file.name);

  const mimeOk =
    (mime && (ALLOWED_MIME as readonly string[]).includes(mime)) ||
    (ext && (ALLOWED_EXT as readonly string[]).includes(ext));

  if (!mimeOk) {
    throw new Error("Định dạng ảnh không hợp lệ. Chỉ nhận JPG/PNG/WebP.");
  }
  if (file.size > MAX_BYTES) {
    throw new Error("Ảnh quá lớn (tối đa 5MB). Vui lòng nén hoặc chọn ảnh nhỏ hơn.");
  }
}

function buildPath(propertyId: string, file: File, mime: string): string {
  const extFromMime = MIME_TO_EXT[mime] || getExtFromName(file.name) || "jpg";
  const ext = (ALLOWED_EXT as readonly string[]).includes(extFromMime as any)
    ? extFromMime
    : "jpg";
  const uuid =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  return `${propertyId}/${uuid}.${ext}`;
}

export async function uploadPropertyImage(
  file: File,
  propertyId: string
): Promise<{ path: string; url: string }> {
  // 1) Kiểm MIME & size (client)
  ensureAllowed(file);

  // 2) Bắt buộc đã đăng nhập để thoả RLS "authenticated"
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) throw new Error("Bạn cần đăng nhập trước khi tải ảnh.");

  // 3) Tạo path (dựa vào MIME/đuôi, không tin đuôi gốc)
  const mime = pickMime(file) || "image/jpeg";
  const path = buildPath(propertyId, file, mime);

  // 4) Upload (kèm contentType + metadata.size/mimetype để RLS kiểm)
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    upsert: false,
    contentType: mime,
    cacheControl: "3600",
    // Supabase Storage (SDK mới) hỗ trợ metadata khi upload
    metadata: {
      size: String(file.size),
      mimetype: mime,
    } as Record<string, string>,
  });

  if (error) {
    const msg = (error.message || "").toLowerCase();
    if (msg.includes("payload") || msg.includes("too large")) {
      throw new Error("Ảnh vượt quá giới hạn dung lượng.");
    }
    if (error.statusCode === 401 || msg.includes("unauthorized")) {
      throw new Error("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.");
    }
    if (msg.includes("duplicate") || msg.includes("exists")) {
      throw new Error("Tệp đã tồn tại, vui lòng chọn ảnh khác.");
    }
    throw error;
  }

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return { path, url: data.publicUrl };
}

export function getPublicUrl(path: string) {
  return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
}
