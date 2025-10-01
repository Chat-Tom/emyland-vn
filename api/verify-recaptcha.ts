// /api/verify-recaptcha.ts
import type { VercelRequest, VercelResponse } from "@vercel/node";

/** ===== CORS =====
 * Hỗ trợ nhiều origin qua ENV ALLOW_ORIGINS (phân tách bằng dấu phẩy),
 * fallback về FRONTEND_URL / PUBLIC_SITE_URL / nhadat.ai.vn
 */
const DEFAULT_ORIGINS = [
  "https://www.nhadat.ai.vn",
  "https://nhadat.ai.vn",
  "http://localhost:8081",
];

const ENV_ORIGINS = (process.env.ALLOW_ORIGINS || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

const FRONTEND = (process.env.FRONTEND_URL || process.env.PUBLIC_SITE_URL || "").trim();

const ALLOWED = [
  ...ENV_ORIGINS,
  ...(FRONTEND ? [FRONTEND] : []),
  ...DEFAULT_ORIGINS,
];

function pickOrigin(req: VercelRequest) {
  const reqOrigin =
    (req.headers["origin"] as string) ||
    (req.headers["referer"] as string) ||
    "";
  const matched = ALLOWED.find((o) => reqOrigin.startsWith(o));
  return matched || ALLOWED[0];
}

function setCors(req: VercelRequest, res: VercelResponse) {
  const origin = pickOrigin(req);
  res.setHeader("Access-Control-Allow-Origin", origin);
  res.setHeader("Vary", "Origin");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization, X-Requested-With"
  );
}

export const config = { runtime: "nodejs" };

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCors(req, res);

  // Preflight
  if (req.method === "OPTIONS") return res.status(200).end();

  if (req.method !== "POST") {
    return res.status(405).json({ success: false, error: "method_not_allowed" });
  }

  try {
    // Lấy token an toàn từ body hoặc query
    let token: string | undefined;

    if (typeof req.body === "string") {
      try {
        token = JSON.parse(req.body)?.token;
      } catch {
        /* ignore */
      }
    } else if (req.body && typeof req.body === "object") {
      token = (req.body as any)?.token;
    }
    token = token || (req.query?.token as string | undefined);

    if (!token) {
      return res.status(400).json({ success: false, error: "missing_token" });
    }

    const secret = process.env.RECAPTCHA_SECRET_KEY || process.env.RECAPTCHA_SECRET;
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
