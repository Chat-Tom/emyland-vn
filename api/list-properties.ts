// api/list-properties.ts  (Vercel Serverless Function – Node/TS)
import { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL as string,
  process.env.SUPABASE_SERVICE_ROLE_KEY as string  // server-only
);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method !== 'POST') {
      res.status(405).json({ error: 'Method not allowed' }); return;
    }
    const p = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
    const params = {
      p_listing: p.listing ?? null,  p_social: p.social ?? null,
      p_province: p.province ?? null, p_ward: p.ward ?? null,
      p_prop_type: p.property_type ?? null,
      p_min_price: p.min_price ?? null, p_max_price: p.max_price ?? null,
      p_min_area:  p.min_area ?? null,  p_max_area:  p.max_area ?? null,
      p_limit: Math.min(Number(p.limit ?? 16), 50),
      p_offset: Math.max(Number(p.offset ?? 0), 0),
    };
    const { data, error } = await supabase.rpc('get_properties', params);
    if (error) throw error;

    res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=600');
    res.status(200).json(data);
  } catch (e: any) {
    res.status(500).json({ error: String(e?.message ?? e) });
  }
}
