export const config = { runtime: "nodejs" };
export default async function handler(_req: any, res: any) {
  const url = process.env.SUPABASE_URL || null;
  const ref = url?.match(/https:\/\/([a-z0-9-]+)\.supabase\.co/i)?.[1] ?? null;
  res.setHeader("Content-Type", "application/json");
  res.status(200).send(JSON.stringify({
    supabaseRef: ref,
    hasServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    nodeEnv: process.env.NODE_ENV || null
  }));
}
