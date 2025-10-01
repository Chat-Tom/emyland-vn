import { createClient } from "@supabase/supabase-js";
const supa = createClient(
  process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession:false } }
);
export async function guardRate(req: any, action: string, max: number, windowExpr = "60 seconds") {
  const raw = String(req.headers["x-real-ip"]||req.headers["x-forwarded-for"]||req.socket?.remoteAddress||"");
  const ip = raw.split(",")[0].trim();
  const { error } = await supa.rpc("check_rate", { p_ip: ip, p_action: action, p_max: max, p_window: windowExpr });
  if (error) { const e:any=error; e.status=429; throw e; }
  return ip;
}
