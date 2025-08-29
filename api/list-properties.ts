// api/list-properties.ts
import type { VercelRequest, VercelResponse } from '@vercel/node';

const ALLOWED_ORIGINS = new Set([
  'https://emyland.vn',
  'https://www.emyland.vn',
]);

function setCORS(req: VercelRequest, res: VercelResponse) {
  const origin = (req.headers.origin as string) || '';
  if (ALLOWED_ORIGINS.has(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  } else {
    // Không biết origin -> từ chối chia sẻ credentials, vẫn trả JSON bình thường
    res.setHeader('Access-Control-Allow-Origin', 'https://emyland.vn');
  }
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'Origin, X-Requested-With, Content-Type, Accept, Authorization'
  );
}

function unaccentLower(s?: string) {
  if (!s) return undefined;
  return s
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCORS(req, res);

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET, OPTIONS');
    return res.status(405).json({ error: 'Method not allowed. Use GET with querystring.' });
  }

  try {
    const q = req.query as Record<string, string | string[]>;
    const get = (k: string) => (Array.isArray(q[k]) ? q[k][0] : q[k]);

    const listing   = get('listing');
    const province  = get('province');
    const ward      = get('ward');
    const min_price = get('min_price');
    const max_price = get('max_price');
    const min_area  = get('min_area');
    const max_area  = get('max_area');
    const prop_type = get('prop_type');
    const limit     = get('limit')  ?? '16';
    const offset    = get('offset') ?? '0';

    const params = new URLSearchParams();
    if (listing)   params.set('listing', String(listing));
    if (province)  params.set('province', unaccentLower(String(province))!);
    if (ward)      params.set('ward',     unaccentLower(String(ward))!);
    if (min_price) params.set('min_price', String(min_price));
    if (max_price) params.set('max_price', String(max_price));
    if (min_area)  params.set('min_area',  String(min_area));
    if (max_area)  params.set('max_area',  String(max_area));
    if (prop_type) params.set('prop_type', String(prop_type));
    params.set('limit',  String(limit));
    params.set('offset', String(offset));

    const supabaseUrl = process.env.SUPABASE_URL;
    if (!supabaseUrl) {
      return res.status(500).json({ error: 'missing_env', message: 'SUPABASE_URL not set' });
    }

    const upstream = `${supabaseUrl}/functions/v1/list-properties?${params.toString()}`;
    const r = await fetch(upstream, {
      method: 'GET',
      headers: {
        accept: 'application/json',
        ...(process.env.SUPABASE_ANON_KEY
          ? { authorization: `Bearer ${process.env.SUPABASE_ANON_KEY}` }
          : {}),
      },
    });

    const bodyText = await r.text();

    // Cache CDN 5 phút, SWR 10 phút
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600');

    return res.status(r.status).send(bodyText);
  } catch (err: any) {
    return res
      .status(500)
      .json({ error: 'upstream_error', message: err?.message ?? String(err) });
  }
}
