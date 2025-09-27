// src/lib/supabase.ts
import { createClient } from "@supabase/supabase-js";

/* ================= Env & sanitize ================= */
// ✅ Đọc từ .env(.local) – sanitize BOM & ngoặc
let supabaseUrl = String(import.meta.env.VITE_SUPABASE_URL ?? "")
  .replace(/^\uFEFF/, "")         // bỏ BOM đầu file nếu có
  .replace(/^['"]|['"]$/g, "")    // bỏ ngoặc đơn/kép bọc giá trị
  .trim();

const supabaseAnonKey = String(import.meta.env.VITE_SUPABASE_ANON_KEY ?? "")
  .replace(/^\uFEFF/, "")
  .replace(/^['"]|['"]$/g, "")
  .trim();

// ✅ Vá nhẹ: cắt "/" cuối & kiểm format URL sớm
supabaseUrl = supabaseUrl.replace(/\/+$/, "");
const urlOk = /^https:\/\/[a-z0-9-]+\.supabase\.(co|in)$/i.test(supabaseUrl);

if (!supabaseUrl || !supabaseAnonKey || !urlOk) {
  const urlMsg = supabaseUrl ? `URL hiện tại: ${supabaseUrl}` : "URL trống";
  throw new Error(
    `Supabase environment variables lỗi (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY). ${urlMsg}.\n` +
      `Ví dụ đúng: https://metbdgtkwyqggnngtscf.supabase.co`
  );
}

/* ================= Storage fallback cho mobile/webview ================= */
/**
 * Một số in-app browser (Zalo/FB/Telegram) hoặc Safari private mode chặn localStorage.
 * safeStorage() sẽ thử localStorage → sessionStorage → in-memory để không crash
 * và vẫn cho Supabase auth persistSession hoạt động.
 */
function safeStorage(): Storage {
  try {
    localStorage.setItem("__t", "1");
    localStorage.removeItem("__t");
    return localStorage;
  } catch {
    try {
      sessionStorage.setItem("__t", "1");
      sessionStorage.removeItem("__t");
      return sessionStorage;
    } catch {
      const mem: Record<string, string> = {};
      // Polyfill Storage tối thiểu
      return {
        getItem: (k: string) => (k in mem ? mem[k] : null),
        setItem: (k: string, v: string) => {
          mem[k] = v;
        },
        removeItem: (k: string) => {
          delete mem[k];
        },
        clear: () => {
          Object.keys(mem).forEach((k) => delete mem[k]);
        },
        key: (i: number) => Object.keys(mem)[i] ?? null,
        get length() {
          return Object.keys(mem).length;
        },
      } as Storage;
    }
  }
}

/* ================= Khởi tạo Supabase client ================= */
// ✅ Giữ session + tự refresh token; detectSessionInUrl bật (hỗ trợ OAuth/password flow)
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storage: safeStorage(),
  },
  // Có thể thêm global headers nếu cần audit:
  // global: { headers: { "x-app": "emyland-web" } },
});

/* ✅ (tuỳ chọn) Gắn ra window để debug Console */
if (typeof window !== "undefined") {
  // @ts-ignore
  window.__supabase = supabase;
}

export default supabase;
