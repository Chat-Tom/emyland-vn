import { createClient } from "@supabase/supabase-js";
const supa = createClient(
  process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession:false } }
);
export async function ensureNotBlocked(req:any){
  const raw = String(req.headers["x-real-ip"]||req.headers["x-forwarded-for"]||req.socket?.remoteAddress||"");
  const ip = raw.split(",")[0].trim();
  const { data } = await supa.from("ip_blacklist").select("ip").eq("ip", ip).maybeSingle();
  if (data?.ip) { const e:any=new Error("IP_BLOCKED"); e.status=403; throw e; }
  return ip;
}
