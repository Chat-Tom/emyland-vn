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
    await guardRate(req, "post_property", 5, "1 hour"); // 5 tin/giờ/IP
    const { userEmail, payload, turnstileToken } = (req.body||{});
    const vr = await verifyTurnstile(turnstileToken, String(req.headers["x-forwarded-for"]||""));
    if (!vr.ok) return res.status(400).json({ error:"BOT_DETECTED", code: vr.code });

    const { data, error } = await supa.rpc("rpc_post_property", { p_user_email: userEmail, p_payload: payload });
    if (error) return res.status(400).json({ error: error.message });
    res.json({ ok:true, id: data?.[0]?.id });
  } catch (e:any){ res.status(e.status||429).json({ error: e.message||"RATE_LIMIT" }); }
}
