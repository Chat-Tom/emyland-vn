// api/verify-recaptcha.ts
import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ success: false, error: 'method_not_allowed' });
  }

  const token = (req.body as any)?.token;
  if (!token) {
    return res.status(400).json({ success: false, error: 'missing_token' });
  }

  const secret =
    process.env.CAPTCHA_SECRET_KEY ||
    process.env.RECAPTCHA_SECRET_KEY ||
    process.env.RECAPTCHA_SECRET;

  if (!secret) {
    return res.status(500).json({ success: false, error: 'missing_server_secret' });
  }

  try {
    const ip =
      (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
      (req.socket as any)?.remoteAddress ||
      '';

    const params = new URLSearchParams();
    params.set('secret', secret);
    params.set('response', token);
    if (ip) params.set('remoteip', ip);

    const r = await fetch('https://www.google.com/recaptcha/api/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params,
    });

    const json = await r.json(); // { success: boolean, 'error-codes'?: string[] ... }

    if (!json?.success) {
      return res.status(200).json({
        success: false,
        error: 'verify_failed',
        details: json?.['error-codes'] || [],
      });
    }

    return res.status(200).json({ success: true });
  } catch (e: any) {
    return res.status(500).json({
      success: false,
      error: 'server_error',
      message: String(e?.message || e),
    });
  }
}
