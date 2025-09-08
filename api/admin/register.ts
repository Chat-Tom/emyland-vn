// D:\emyland04082025\api\admin\register.ts
export const config = { runtime: "nodejs" };

import { createClient } from "@supabase/supabase-js";
const admin = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: { persistSession: false },
});

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  const { email, password, fullName, phone } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: "Missing email/password" });

  const { data, error } = await admin.auth.admin.createUser({
    email, password, email_confirm: true, user_metadata: { fullName, phone }
  });
  if (error && !String(error.message || "").includes("already registered")) {
    return res.status(500).json({ error: error.message });
  }
  const authId = data?.user?.id ?? null;

  // app_users có thì upsert; không có thì bỏ qua
  await admin.from("app_users").upsert(
    { email, full_name: fullName ?? null, phone: phone ?? null, auth_user_id: authId },
    { onConflict: "email" }
  ).select().maybeSingle().catch(()=>{});

  res.json({ ok: true, email, auth_user_id: authId });
}
