// api/admin/register.ts
export const config = { runtime: "nodejs" };
import { createClient } from "@supabase/supabase-js";

// ✅ Helper: đọc JSON body an toàn cho mọi runtime (req.body | raw stream)
async function readJson(req: any) {
  if (req?.body && typeof req.body === "object") return req.body;
  if (req?.body && typeof req.body === "string") {
    try { return JSON.parse(req.body); } catch { /* fallthrough */ }
  }
  // đọc lại từ stream nếu body chưa có
  const raw: string = await new Promise((resolve, reject) => {
    let data = "";
    req.on?.("data", (c: any) => (data += c));
    req.on?.("end", () => resolve(data));
    req.on?.("error", (e: any) => reject(e));
    // nếu không có on(...) (đã được parse), trả chuỗi rỗng
    setTimeout(() => resolve(""), 0);
  });
  try { return raw ? JSON.parse(raw) : {}; } catch { return {}; }
}

const admin = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

export default async function handler(req: any, res: any) {
  try {
    if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

    const body = await readJson(req);
    const { email, password, fullName, phone } = body || {};

    if (!email || !password) {
      return res.status(400).json({ error: "Missing email/password" });
    }

    // 1) Tạo user Auth
    const { data, error } = await admin.auth.admin.createUser({
      email, password, email_confirm: true, user_metadata: { fullName, phone }
    });
    if (error && !String(error.message || "").includes("already registered")) {
      console.error("[register] createUser error:", error);
      return res.status(500).json({ error: error.message || "createUser failed" });
    }
    const authId = data?.user?.id ?? null;

    // 2) Đồng bộ app_users nếu tồn tại (không fail toàn hàm)
    try {
      await admin.from("app_users").upsert(
        { email, full_name: fullName ?? null, phone: phone ?? null, auth_user_id: authId },
        { onConflict: "email" }
      ).select().maybeSingle();
    } catch (e) {
      console.warn("[register] app_users upsert warn:", (e as any)?.message || e);
    }

    return res.status(200).json({ ok: true, email, auth_user_id: authId });
  } catch (e: any) {
    console.error("[register] unhandled:", e?.message, e);
    return res.status(500).json({ error: "Unhandled server error" });
  }
}
