import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";
import nodemailer from "nodemailer";

const supa = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth:{ persistSession:false } });

export default async function handler(_req: VercelRequest, res: VercelResponse){
  try {
    const since = new Date(Date.now()-15*60*1000).toISOString();
    const { data } = await supa.rpc("abuse_digest_since", { p_since: since });
    const rows = (data||[]) as any[];
    const html = `
      <h3>EmyLand Abuse Digest (15')</h3>
      <table border="1" cellpadding="6" cellspacing="0">
        <tr><th>Action</th><th>IP</th><th>Count</th></tr>
        ${rows.map(r=>`<tr><td>${r.action}</td><td>${r.ip}</td><td>${r.cnt}</td></tr>`).join("")}
      </table>
    `;
    const tx = nodemailer.createTransport({
      host: process.env.SMTP_HOST, port: Number(process.env.SMTP_PORT||465),
      secure: String(process.env.SMTP_SECURE||"true")==="true",
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
    });
    await tx.sendMail({
      from: process.env.SMTP_FROM, to: process.env.ABUSE_ALERT_EMAIL||process.env.SMTP_USER,
      subject: "Abuse Digest 15’", html
    });
    res.json({ ok:true, count: rows.length });
  } catch(e:any){ res.status(500).json({ error:e.message }); }
}
