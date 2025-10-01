// api/verify-recaptcha.ts
import type { VercelRequest, VercelResponse } from '@vercel/node';

const ALLOW_ORIGINS = [
  'https://nhadat.ai.vn',
  'https://www.nhadat.ai.vn',
  'http://localhost:8081',
  'http://127.0.0.1:8081',
];

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const origin = req.headers.origin || '';
  if (ALLOW_ORIGINS.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
  }
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'method_not_allowed' });

  const secret = process.env.RECAPTCHA_SECRET_KEY;
  if (!secret) return res.status(500).json({ success: false, error: 'missing_secret' });

  const token = (req.body && ((req.body as any).token || (req.body as any)['g-recaptcha-response'])) || '';
  if (!token) return res.status(400).json({ success: false, error: 'missing_token' });

  try {
    const params = new URLSearchParams();
    params.set('secret', secret);
    params.set('response', token);

    const g = await fetch('https://www.google.com/recaptcha/api/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    });
    const data = await g.json();

    if (data.success) {
      return res.status(200).json({ success: true, score: data.score ?? null, action: data.action ?? null });
    }
    return res.status(400).json({ success: false, error: 'verification_failed', details: data['error-codes'] ?? [] });
  } catch (e: any) {
    return res.status(500).json({ success: false, error: 'server_error', message: e?.message });
  }
}
