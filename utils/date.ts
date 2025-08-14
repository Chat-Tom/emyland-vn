// utils/date.ts

/** ISO của thời điểm hiện tại */
export const nowIso = () => new Date().toISOString();

/** Định dạng ngày/giờ theo vi-VN */
export const formatDateTime = (d: string | number | Date) =>
  new Date(d).toLocaleString("vi-VN");

/** Nhãn hiển thị ngày đăng: Hôm nay / Hôm qua / X ngày trước / dd/mm/yyyy */
export function postDateLabel(input: string | number | Date): string {
  const d = new Date(input);
  if (Number.isNaN(d.getTime())) return "";

  const startOf = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate());
  const today = startOf(new Date());
  const day = startOf(d);

  const diffDays = Math.floor((today.getTime() - day.getTime()) / 86_400_000);

  if (diffDays === 0) return "Hôm nay";
  if (diffDays === 1) return "Hôm qua";
  if (diffDays > 1 && diffDays < 7) return `${diffDays} ngày trước`;

  return d.toLocaleDateString("vi-VN");
}
