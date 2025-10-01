// api/verify-recaptcha.ts
import type { VercelRequest, VercelResponse } from "@vercel/node";

const ALLOW_ORIGIN =
  process.env.FRONTEND_URL ||
  process.env.PUBLIC_SITE_URL ||
  "https://www.nhadat.ai.vn";

function setCors(res: VercelResponse) {
  res.setHeader("Access-Control-Allow-Origin", ALLOW_ORIGIN);
  res.setHeader("Vary", "Origin");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization, X-Requested-With"
  );
}

export const config = { runtime: "nodejs" };

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCors(res);

  // preflight
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res
      .status(405)
      .json({ success: false, error: "method_not_allowed" });
  }

  try {
    // lấy token an toàn từ body hoặc query (fallback)
    let token: string | undefined;

    if (typeof req.body === "string") {
      try {
        token = JSON.parse(req.body)?.token;
      } catch {
        /* noop */
      }
    } else if (req.body && typeof req.body === "object") {
      token = (req.body as any)?.token;
    }
    token = token || (req.query?.token as string | undefined);

    if (!token) {
      return res
        .status(400)
        .json({ success: false, error: "missing_token" });
    }

    const secret =
      process.env.RECAPTCHA_SECRET_KEY || process.env.RECAPTCHA_SECRET;
    if (!secret) {
      return res
        .status(500)
        .json({ success: false, error: "missing_server_secret" });
    }

    const params = new URLSearchParams();
    params.set("secret", secret);
    params.set("response", token);
    const ip =
      (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ||
      (req as any).socket?.remoteAddress ||
      "";
    if (ip) params.set("remoteip", ip);

    const r = await fetch("https://www.google.com/recaptcha/api/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params.toString(),
    });
    const json = await r.json();

    // json: { success:boolean, challenge_ts, hostname, score?, action?, "error-codes"?:string[] }
    if (!json?.success) {
      return res.status(400).json({
        success: false,
        error: "verify_failed",
        details: json?.["error-codes"] || [],
      });
    }

    return res.status(200).json({ success: true });
  } catch (e: any) {
    return res.status(500).json({
      success: false,
      error: "server_error",
      message: String(e?.message || e),
    });
  }
}
