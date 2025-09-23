// src/lib/supabase.ts
import { createClient } from "@supabase/supabase-js";

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

/* ✅ Giữ session + tự refresh token (password flow & SPA) */
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true, // OK cho OAuth; không hại với password flow
  },
});

/* ✅ (tuỳ chọn) Gắn ra window để debug Console */
if (typeof window !== "undefined") {
  // @ts-ignore
  window.__supabase = supabase;
}

export default supabase;
