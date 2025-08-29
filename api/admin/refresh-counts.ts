// api/admin/refresh-counts.ts
import { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL as string,
  process.env.SUPABASE_SERVICE_ROLE_KEY as string
);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') { res.status(405).json({ error: 'Method not allowed' }); return; }
  const auth = req.headers.authorization;
  if (auth !== `Bearer ${process.env.CRON_TOKEN}`) { res.status(401).json({ error: 'unauthorized' }); return; }

  const { error } = await supabase.rpc('refresh_mv_props_counts');
  if (error) { res.status(500).json({ ok:false, error }); return; }
  res.status(200).json({ ok:true });
}
