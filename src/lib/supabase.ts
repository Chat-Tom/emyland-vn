import { createClient } from "@supabase/supabase-js";

// ✅ Đọc từ .env(.local) – có sanitize loại BOM & ngoặc
const supabaseUrl = String(import.meta.env.VITE_SUPABASE_URL ?? "")
  .replace(/^\uFEFF/, "")         // bỏ BOM đầu file nếu có
  .replace(/^['"]|['"]$/g, "")    // bỏ ngoặc đơn/kép bọc giá trị
  .trim();

const supabaseAnonKey = String(import.meta.env.VITE_SUPABASE_ANON_KEY ?? "")
  .replace(/^\uFEFF/, "")
  .replace(/^['"]|['"]$/g, "")
  .trim();

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Supabase environment variables are missing! (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY)");
}

/* ✅ Giữ session + tự refresh token (đúng cho password flow & SPA) */
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true, // OK cho OAuth; không hại với password flow
  },
});

/* ✅ (tuỳ chọn) Gắn ra window phục vụ debug Console */
if (typeof window !== "undefined") {
  // @ts-ignore
  window.__supabase = supabase;
}

export default supabase;
