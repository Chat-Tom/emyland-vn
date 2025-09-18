// src/pages/api/verify-recaptcha.ts
export const config = { runtime: "nodejs" };

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") return res.status(405).json({ success: false, error: "Method not allowed" });

  const { token } = req.body || {};
  if (!token) return res.status(400).json({ success: false, error: "Missing token" });

  try {
    const secret = process.env.RECAPTCHA_SECRET_KEY;
    if (!secret) return res.status(500).json({ success: false, error: "Missing secret" });

    const r = await fetch(`https://www.google.com/recaptcha/api/siteverify`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ secret, response: token }),
    });
    const json = await r.json();

    // json: { success: boolean, challenge_ts, hostname, ... }
    if (!json.success) return res.status(400).json({ success: false, error: "recaptcha_failed", details: json });
    return res.status(200).json({ success: true });
  } catch (e: any) {
    return res.status(500).json({ success: false, error: e?.message || "internal_error" });
  }
}
