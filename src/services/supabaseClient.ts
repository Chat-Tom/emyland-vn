// src/services/supabaseClient.ts
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Hỗ trợ nhiều tên biến môi trường để chạy mượt ở Vercel + local:
 *  - VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY  (chuẩn Vite)
 *  - URL_SUPABASE / SUPABASE_ANON_KEY            (đúng như Tom đang đặt trên Vercel)
 * Nếu biến không có => dùng fallback bên dưới (chỉ nên dùng khi thử nhanh).
 */

const env = import.meta.env as any;

const URL_ENV =
  env?.VITE_SUPABASE_URL ||
  env?.URL_SUPABASE ||
  (typeof window !== "undefined" ? (window as any).__SUPABASE_URL__ : undefined);

const KEY_ENV =
  env?.VITE_SUPABASE_ANON_KEY ||
  env?.SUPABASE_ANON_KEY ||
  (typeof window !== "undefined" ? (window as any).__SUPABASE_ANON_KEY__ : undefined);

/** Fallback để chạy ngay (khuyến nghị: để trong ENV, không hardcode khi lên prod) */
const DEFAULT_URL = "https://metbdgtkwyqggnngtscf.supabase.co";
const DEFAULT_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1ldGJkZ3Rrd3lxZ2dubmd0c2NmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM1OTc5MTIsImV4cCI6MjA2OTE3MzkxMn0.vj48J9Ul-MH7xZkERJATBzbvarmGN4CG45dnLoBhgMk";

/** Client dùng chung toàn app */
export const supabase: SupabaseClient = createClient(
  URL_ENV || DEFAULT_URL,
  KEY_ENV || DEFAULT_ANON_KEY
);
