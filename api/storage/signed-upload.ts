import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";
import { guardRate } from "../_lib/rate";
import { verifyTurnstile } from "../_lib/turnstile";
import { ensureNotBlocked } from "../_lib/ipblock";

const BUCKET="properties";
const supa = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth:{ persistSession:false } });

export default async function handler(req: VercelRequest, res: VercelResponse){
  if (req.method !== "POST") return res.status(405).end();
  try {
    await ensureNotBlocked(req);
    await guardRate(req, "signed_upload", 20, "60 seconds");
    const { path, turnstileToken } = (req.body||{});
    const vr = await verifyTurnstile(turnstileToken, String(req.headers["x-forwarded-for"]||""));
    if (!vr.ok) return res.status(400).json({ error:"BOT_DETECTED", code: vr.code });

    const { data, error } = await supa.storage.from(BUCKET).createSignedUploadUrl(path, 60);
    if (error) return res.status(400).json({ error: error.message });
    res.json(data); // { signedUrl, path, token }
  } catch(e:any){ res.status(e.status||429).json({ error: e.message||"RATE_LIMIT" }); }
}
