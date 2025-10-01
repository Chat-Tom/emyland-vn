// api/admin/register.ts
export const config = { runtime: "nodejs" };
import { createClient } from "@supabase/supabase-js";

// đọc JSON body an toàn
async function readJson(req: any) {
  if (req?.body && typeof req.body === "object") return req.body;
  if (req?.body && typeof req.body === "string") { try { return JSON.parse(req.body); } catch {} }
  const raw: string = await new Promise((resolve) => {
    let s = ""; req.on?.("data",(c:any)=>s+=c); req.on?.("end",()=>resolve(s)); setTimeout(()=>resolve(""),0);
  });
  try { return raw ? JSON.parse(raw) : {}; } catch { return {}; }
}

const admin = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: { persistSession: false },
});

export default async function handler(req: any, res: any) {
  try {
    if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

    const body = await readJson(req);
    const { email, password, fullName, phone } = body || {};
    if (!email || !password) return res.status(400).json({ error: "Missing email/password" });

    const { data, error } = await admin.auth.admin.createUser({
      email, password, email_confirm: true, user_metadata: { fullName, phone }
    });

    // nếu đã đăng ký trước đó thì coi như OK
    if (error && !/already.*registered/i.test(error.message || "")) {
      console.error("[register] createUser error:", error);
      return res.status(500).json({ error: error.message || "createUser failed" });
    }
    const authId = data?.user?.id ?? null;

    // upsert app_users nếu có bảng
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
    console.error("[register] unhandled:", e?.message);
    return res.status(500).json({ error: "Unhandled server error" });
  }
}
