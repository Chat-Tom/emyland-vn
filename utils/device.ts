// utils/device.ts
/**
 * Giữ nguyên API cũ:
 *  - export const isBrowser
 *  - export function getDeviceId()
 *  - export const getOrCreateDeviceId = getDeviceId
 *
 * Tối ưu thêm:
 *  - Bộ nhớ đệm trong module để không đọc/ghi localStorage nhiều lần
 *  - Kiểm tra khả dụng của localStorage (quota / private mode)
 *  - Thêm helper set/reset (không bắt buộc dùng)
 *  - Export default object để import linh hoạt
 */

export const isBrowser = typeof window !== "undefined";

// KHÔNG đổi khoá để không làm mất ID đã lưu trước đây
const DEVICE_KEY = "emyland_device_id";

// Cache trong vòng đời module để giảm chạm storage
let cachedId: string | null = null;

function canUseLocalStorage(): boolean {
  if (!isBrowser) return false;
  try {
    const TEST_KEY = "__emyland_ls_test__";
    localStorage.setItem(TEST_KEY, "1");
    localStorage.removeItem(TEST_KEY);
    return true;
  } catch {
    return false;
  }
}

function genId(): string {
  try {
    // randomUUID có sẵn trên hầu hết trình duyệt hiện đại
    if (typeof crypto !== "undefined" && typeof (crypto as any).randomUUID === "function") {
      return (crypto as any).randomUUID();
    }
    // Fallback uuid v4 đơn giản từ getRandomValues nếu có
    if (typeof crypto !== "undefined" && typeof (crypto as any).getRandomValues === "function") {
      const buf = new Uint8Array(16);
      (crypto as any).getRandomValues(buf);
      // Set variant & version bits theo v4
      buf[6] = (buf[6] & 0x0f) | 0x40;
      buf[8] = (buf[8] & 0x3f) | 0x80;
      const hex = [...buf].map(b => b.toString(16).padStart(2, "0"));
      return `${hex.slice(0, 4).join("")}-${hex.slice(4, 6).join("")}-${hex.slice(6, 8).join("")}-${hex
        .slice(8, 10)
        .join("")}-${hex.slice(10).join("")}`;
    }
  } catch {
    // no-op
  }
  // Fallback cuối cùng: chuỗi ngẫu nhiên + timestamp (giữ logic cũ)
  return "dev-" + Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function readIdFromStorage(key = DEVICE_KEY): string {
  if (!canUseLocalStorage()) return "";
  try {
    return localStorage.getItem(key) || "";
  } catch {
    return "";
  }
}

function writeIdToStorage(id: string, key = DEVICE_KEY): void {
  if (!canUseLocalStorage()) return;
  try {
    localStorage.setItem(key, id);
  } catch {
    // Có thể trượt vì quota / private mode -> bỏ qua
  }
}

/** Hành vi giữ nguyên: SSR trả "server", browser thì lấy từ localStorage, không có thì tạo mới và lưu */
export function getDeviceId(): string {
  if (!isBrowser) return "server";
  if (cachedId) return cachedId;

  let id = readIdFromStorage(DEVICE_KEY);
  if (!id) {
    id = genId();
    writeIdToStorage(id, DEVICE_KEY);
  }
  cachedId = id;
  return id;
}

/** Alias giữ tương thích với code cũ */
export const getOrCreateDeviceId = getDeviceId;

/** Tuỳ chọn: ép set ID thủ công (hiếm khi cần) */
export function setDeviceId(id: string): void {
  if (!isBrowser) return;
  cachedId = id;
  writeIdToStorage(id, DEVICE_KEY);
}

/** Tuỳ chọn: xoá ID để sinh lại */
export function resetDeviceId(): void {
  if (!isBrowser || !canUseLocalStorage()) return;
  try {
    localStorage.removeItem(DEVICE_KEY);
  } catch {
    // no-op
  }
  cachedId = null;
}

export default {
  isBrowser,
  getDeviceId,
  getOrCreateDeviceId,
  setDeviceId,
  resetDeviceId,
};
