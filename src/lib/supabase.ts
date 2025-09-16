import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://metbdgtkwyqggnngtscf.supabase.co";
const supabaseAnonKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1ldGJkZ3Rrd3lxZ2dubmd0c2NmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM1OTc5MTIsImV4cCI6MjA2OTE3MzkxMn0.vj48J9Ul-MH7xZkERJATBzbvarmGN4CG45dnLoBhgMk";

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Supabase environment variables are missing!");
}

/* ✅ THÊM: cấu hình auth để giữ session + tự refresh token */
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

/* ✅ THÊM (tuỳ chọn debug): gắn ra window để dùng trên Console */
if (typeof window !== "undefined") {
  // @ts-ignore
  window.__supabase = supabase;
}

export default supabase;
