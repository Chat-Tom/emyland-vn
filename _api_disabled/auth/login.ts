import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";
import { guardRate } from "../_lib/rate";
import { verifyTurnstile } from "../_lib/turnstile";
import { ensureNotBlocked } from "../_lib/ipblock";

const supa = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth:{ persistSession:false } });

export default async function handler(req: VercelRequest, res: VercelResponse){
  if (req.method !== "POST") return res.status(405).end();
  try {
    await ensureNotBlocked(req);
    await guardRate(req, "login", 10, "60 seconds"); // 10 lần/phút/IP
    const { id, password, deviceId, turnstileToken } = (req.body||{});
    const vr = await verifyTurnstile(turnstileToken, String(req.headers["x-forwarded-for"]||""));
    if (!vr.ok) return res.status(400).json({ error:"BOT_DETECTED", code: vr.code });

    const { data, error } = await supa.rpc("rpc_login", { p_email_or_phone:id, p_password:password, p_device_id:deviceId });
    if (error || !data?.[0]?.access_token) return res.status(401).json({ error:"LOGIN_FAILED" });
    res.json(data[0]);
  } catch (e:any){ res.status(e.status||429).json({ error: e.message||"RATE_LIMIT" }); }
}
