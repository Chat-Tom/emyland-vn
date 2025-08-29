import { serve } from "https://deno.land/std/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
serve(async () => {
  const { error } = await supabase.rpc("refresh_mv_props_counts");
  const ok = !error;
  return new Response(JSON.stringify({ ok, error }), { status: ok ? 200 : 500, headers: { "content-type": "application/json" } });
});
