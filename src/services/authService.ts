import { supabase } from "@/lib/supabase";
// Nếu đang dùng StorageManager, giữ nguyên file cũ và CHỈ thêm 3 helper dưới:
const TOKEN_KEY = "emy_access_token";

function setToken(t: string) { localStorage.setItem(TOKEN_KEY, t); }
export function getToken()    { return localStorage.getItem(TOKEN_KEY) || ""; }
export function clearToken()  { localStorage.removeItem(TOKEN_KEY); }

function saveUserToStorage(u: { id: string; email?: string|null; phone?: string|null; full_name?: string|null }) {
  const cur = {
    id: u.id,
    email: u.email || "",
    phone: u.phone || "",
    fullName: u.full_name || "",
    isLoggedIn: true,
  };
  try {
    // ưu tiên API sẵn có nếu có
    (StorageManager as any)?.saveUser?.(cur);
  } catch { localStorage.setItem("emyland_user", JSON.stringify(cur)); }
  return cur;
}

export async function registerUser(params: { email?: string; phone?: string; password: string; fullName?: string }) {
  const { email = null, phone = null, password, fullName = null } = params;
  const { data, error } = await supabase.rpc("rpc_register_user", {
    p_email: email, p_phone: phone, p_password: password, p_full_name: fullName,
  });
  if (error) throw error;
  return data?.[0];
}

function deviceId() {
  const k = "emy_device_id";
  let v = localStorage.getItem(k);
  if (!v) { v = `${navigator.userAgent.slice(0,32)}-${Math.random().toString(36).slice(2)}`; localStorage.setItem(k, v); }
  return v;
}

export async function login(emailOrPhone: string, password: string) {
  const { data, error } = await supabase.rpc("rpc_login", {
    p_email_or_phone: emailOrPhone,
    p_password: password,
    p_device_id: deviceId(),
    // p_ttl_minutes: 43200, // 30 ngày (giữ mặc định)
  });
  if (error) throw error;
  const row = data?.[0];
  if (!row?.access_token) throw new Error("LOGIN_FAILED");
  setToken(row.access_token);
  const user = saveUserToStorage({ id: row.user_id, email: row.email, phone: row.phone, full_name: row.full_name });
  return { token: row.access_token, user };
}

export async function me(token = getToken()) {
  if (!token) return null;
  const { data, error } = await supabase.rpc("rpc_me", { p_token: token });
  if (error) return null;
  const row = data?.[0];
  if (!row?.user_id) return null;
  return saveUserToStorage({ id: row.user_id, email: row.email, phone: row.phone, full_name: row.full_name });
}

export async function logout() {
  const t = getToken();
  try { if (t) await supabase.rpc("rpc_logout", { p_token: t }); } catch {}
  clearToken();
  try { (StorageManager as any)?.logout?.(); } catch {}
}
