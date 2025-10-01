// api/verify-recaptcha.ts
import type { VercelRequest, VercelResponse } from '@vercel/node';

const ALLOW_ORIGINS = [
  'https://nhadat.ai.vn',
  'https://www.nhadat.ai.vn',
  'http://localhost:8081',
  'http://127.0.0.1:8081',
];

function setCors(req: VercelRequest, res: VercelResponse) {
  const origin = req.headers.origin || '';
  if (ALLOW_ORIGINS.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
  } else {
    // fallback an toàn khi không match whitelist (tuỳ chọn)
    res.setHeader('Access-Control-Allow-Origin', 'https://nhadat.ai.vn');
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

function extractToken(req: VercelRequest): string {
  // 1) query ?token=
  if (typeof req.query?.token === 'string' && req.query.token) return req.query.token;

  // 2) JSON body
  const b: any = req.body;
  if (b && typeof b === 'object') {
    if (typeof b.token === 'string' && b.token) return b.token;
    if (typeof b['g-recaptcha-response'] === 'string' && b['g-recaptcha-response']) {
      return b['g-recaptcha-response'];
    }
  }

  // 3) x-www-form-urlencoded (Vercel có thể đưa vào string raw)
  if (b && typeof b === 'string') {
    const sp = new URLSearchParams(b);
    const v = sp.get('token') || sp.get('g-recaptcha-response');
    if (v) return v;
  }

  return '';
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCors(req, res);

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'method_not_allowed' });
  }

  const secret = process.env.RECAPTCHA_SECRET_KEY;
  if (!secret) return res.status(500).json({ success: false, error: 'missing_secret' });

  const token = extractToken(req);
  if (!token) return res.status(400).json({ success: false, error: 'missing_token' });

  try {
    const params = new URLSearchParams({ secret, response: token });
    const g = await fetch('https://www.google.com/recaptcha/api/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    });

    const data = await g.json();
    if (data?.success) {
      return res.status(200).json({
        success: true,
        score: data.score ?? null,
        action: data.action ?? null,
      });
    }

    return res
      .status(400)
      .json({ success: false, error: 'verification_failed', details: data?.['error-codes'] ?? [] });
  } catch (e: any) {
    return res.status(500).json({ success: false, error: 'server_error', message: e?.message });
  }
}
