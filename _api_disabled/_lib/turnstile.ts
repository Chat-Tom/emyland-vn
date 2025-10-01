export async function verifyTurnstile(token: string, ip?: string) {
  if (!process.env.TURNSTILE_SECRET) return { ok: false, code: "NO_SECRET" };
  if (!token) return { ok: false, code: "NO_TOKEN" };
  const body = new URLSearchParams({
    secret: process.env.TURNSTILE_SECRET,
    response: token,
    ...(ip ? { remoteip: ip } : {}),
  });
  const r = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify",{ method:"POST", body });
  const data = await r.json().catch(() => ({}));
  return { ok: !!data.success, code: (data["error-codes"]||[])[0] };
}
