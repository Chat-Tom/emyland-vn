export default async function handler(req, res) {
  try {
    res.setHeader('Cache-Control', 'no-store');
    if (req.method !== 'POST') return res.status(405).json({ success:false, error:'method_not_allowed' });

    const token = req.body?.token;
    if (!token) return res.status(400).json({ success:false, error:'missing_token' });

    const secret = process.env.RECAPTCHA_SECRET;
    if (!secret) return res.status(500).json({ success:false, error:'missing_server_secret' });

    const params = new URLSearchParams();
    params.set('secret', secret);
    params.set('response', token);
    const ip = (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || req.socket?.remoteAddress || '';
    if (ip) params.set('remoteip', ip);

    const r = await fetch('https://www.google.com/recaptcha/api/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    });
    const json = await r.json();
    if (json?.success) return res.status(200).json({ success:true });
    return res.status(200).json({ success:false, error:'verify_failed', details: json?.['error-codes'] || [] });
  } catch (e) {
    return res.status(500).json({ success:false, error:'server_error', message:String(e?.message || e) });
  }
}
