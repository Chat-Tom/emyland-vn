// src/utils/date.ts
// Utilities for rendering "Đăng: hôm nay / hôm qua / dd/mm/yyyy" (local time)

/** Compare two dates by year-month-day (local time, ignores time of day) */
function isSameYMD(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

/** Start-of-day helper (local) */
function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

/**
 * Get human label for a post date:
 *  - today     -> "hôm nay"
 *  - yesterday -> "hôm qua"
 *  - otherwise -> "dd/mm/yyyy" (vi-VN)
 * If invalid input -> ""
 */
export function postDateLabel(input: string | number | Date): string {
  const d = new Date(input);
  if (Number.isNaN(d.getTime())) return "";

  const todayStart = startOfDay(new Date());
  const yesterdayStart = new Date(todayStart);
  yesterdayStart.setDate(todayStart.getDate() - 1);

  if (isSameYMD(d, todayStart)) return "hôm nay";
  if (isSameYMD(d, yesterdayStart)) return "hôm qua";
  return d.toLocaleDateString("vi-VN");
}

/** Render with prefix "Đăng: ..." using postDateLabel */
export function renderPosted(input: string | number | Date): string {
  const label = postDateLabel(input);
  return label ? `Đăng: ${label}` : "";
}

/** Optional convenience flags */
export function isToday(input: string | number | Date): boolean {
  const d = new Date(input);
  if (Number.isNaN(d.getTime())) return false;
  return isSameYMD(d, new Date());
}

export function isYesterday(input: string | number | Date): boolean {
  const d = new Date(input);
  if (Number.isNaN(d.getTime())) return false;
  const y = startOfDay(new Date());
  y.setDate(y.getDate() - 1);
  return isSameYMD(d, y);
}
