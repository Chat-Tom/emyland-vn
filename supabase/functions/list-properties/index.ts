import { serve } from "https://deno.land/std/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
serve(async (req) => {
  try {
    const p = await req.json().catch(() => ({}));
    const params = {
      p_listing: p.listing ?? null, p_social: p.social ?? null,
      p_province: p.province ?? null, p_ward: p.ward ?? null, p_prop_type: p.property_type ?? null,
      p_min_price: p.min_price ?? null, p_max_price: p.max_price ?? null,
      p_min_area: p.min_area ?? null, p_max_area: p.max_area ?? null,
      p_limit: Math.min(Number(p.limit ?? 16), 50), p_offset: Math.max(Number(p.offset ?? 0), 0),
    };
    const { data, error } = await supabase.rpc("get_properties", params);
    if (error) throw error;
    return new Response(JSON.stringify(data), { status: 200, headers: { "content-type": "application/json", "cache-control": "public, s-maxage=60, stale-while-revalidate=600" }});
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { "content-type": "application/json" }});
  }
});
