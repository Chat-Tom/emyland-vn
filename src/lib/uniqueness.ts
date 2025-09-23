// src/lib/uniqueness.ts
import { supabase } from "@/lib/supabase";

export async function phoneExists(phone: string, excludeUserId?: string) {
  const raw = phone.replace(/\D/g, "");
  const intl = raw.startsWith("0") ? `84${raw.slice(1)}` : raw;
  let q = supabase.from("users_public")
    .select("id", { count: "exact", head: true })
    .or(`phone.eq.${raw},phone.eq.${intl}`);
  if (excludeUserId) q = q.neq("id", excludeUserId);
  const { count, error } = await q;
  if (error) return false;
  return (count ?? 0) > 0;
}

export async function emailExists(email: string, excludeUserId?: string) {
  let q = supabase.from("users_public")
    .select("id", { count: "exact", head: true })
    .ilike("email", email.trim().toLowerCase());
  if (excludeUserId) q = q.neq("id", excludeUserId);
  const { count, error } = await q;
  if (error) return false;
  return (count ?? 0) > 0;
}
