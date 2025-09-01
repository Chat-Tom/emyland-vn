// utils/date.ts
// Helper ngày giờ: "Đăng: hôm nay / hôm qua / dd/mm/yyyy" + ngày "Xác nhận chính chủ"
// Ép múi giờ Việt Nam cho tất cả label/ngày hiển thị.

const VN_TZ = "Asia/Ho_Chi_Minh";

// Dùng 1 formatter để so sánh theo yyyy-mm-dd trong múi giờ VN
const VN_YMD = new Intl.DateTimeFormat("en-CA", {
  timeZone: VN_TZ,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** Compare two dates by year-month-day theo múi giờ VN (bỏ qua giờ) */
function isSameYMD_VN(a: Date, b: Date): boolean {
  return VN_YMD.format(a) === VN_YMD.format(b);
}

/** Parse any input to Date or return undefined */
function toDate(input: any): Date | undefined {
  const d = new Date(input);
  return Number.isNaN(d.getTime()) ? undefined : d;
}

/** dd/mm/yyyy (vi-VN, giờ Việt Nam) */
export function formatVNDate(input: string | number | Date): string {
  const d = toDate(input);
  return d ? d.toLocaleDateString("vi-VN", { timeZone: VN_TZ }) : "";
}

/**
 * Nhãn ngắn cho ngày đăng (giờ VN):
 *  - hôm nay / hôm qua / dd/mm/yyyy
 */
export function postDateLabel(input: string | number | Date): string {
  const d = toDate(input);
  if (!d) return "";

  const today = new Date();
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);

  if (isSameYMD_VN(d, today)) return "hôm nay";
  if (isSameYMD_VN(d, yesterday)) return "hôm qua";
  return d.toLocaleDateString("vi-VN", { timeZone: VN_TZ });
}

/** Render có prefix "Đăng: ..." (giờ VN) */
export function renderPosted(input: string | number | Date): string {
  const label = postDateLabel(input);
  return label ? `Đăng: ${label}` : "";
}

/** Flags tiện dùng (giờ VN) */
export function isToday(input: string | number | Date): boolean {
  const d = toDate(input);
  return !!d && isSameYMD_VN(d, new Date());
}
export function isYesterday(input: string | number | Date): boolean {
  const d = toDate(input);
  if (!d) return false;
  const y = new Date(Date.now() - 24 * 60 * 60 * 1000);
  return isSameYMD_VN(d, y);
}

/* ============================================================================
   XÁC NHẬN CHÍNH CHỦ
   - Lấy ngày xác nhận từ các field phổ biến
   - Nếu không có field riêng, khi status "verified" thì fallback về updatedAt,
     nếu vẫn không có thì dùng createdAt (ít gặp).
============================================================================ */

/** Trả về Date "xác nhận chính chủ" nếu suy luận được */
export function getVerifiedAt(obj: any): Date | undefined {
  if (!obj) return undefined;

  // các field thường gặp
  const candidates = [
    obj?.contactInfo?.ownerVerifiedAt,
    obj?.ownerVerifiedAt,
    obj?.verifiedAt,
    obj?.verificationDate,
    obj?.verified_on,
    obj?.verified_date,
    obj?.verified_at,
    obj?.verification_at,
  ];

  for (const c of candidates) {
    const d = toDate(c);
    if (d) return d;
  }

  // fallback nếu đối tượng đang verified mà không có ngày riêng
  const isVerified =
    obj?.verificationStatus === "verified" ||
    obj?.is_verified ||
    obj?.verified ||
    obj?.contactInfo?.ownerVerified;

  if (isVerified) {
    const d = toDate(obj?.updatedAt ?? obj?.updated_at ?? obj?.createdAt ?? obj?.created_at);
    if (d) return d;
  }
  return undefined;
}

/** "Đã xác nhận chính chủ ngày dd/mm/yyyy" (rỗng nếu chưa xác nhận) – giờ VN */
export function renderVerifiedAt(objOrDate: any): string {
  const d =
    objOrDate instanceof Date || typeof objOrDate === "string" || typeof objOrDate === "number"
      ? toDate(objOrDate)
      : getVerifiedAt(objOrDate);
  return d ? `Đã xác nhận chính chủ ngày ${d.toLocaleDateString("vi-VN", { timeZone: VN_TZ })}` : "";
}

/** Chỉ phần "ngày dd/mm/yyyy" cho UI hẹp – giờ VN */
export function verifiedDateLabel(objOrDate: any): string {
  const d =
    objOrDate instanceof Date || typeof objOrDate === "string" || typeof objOrDate === "number"
      ? toDate(objOrDate)
      : getVerifiedAt(objOrDate);
  return d ? `ngày ${d.toLocaleDateString("vi-VN", { timeZone: VN_TZ })}` : "";
}
