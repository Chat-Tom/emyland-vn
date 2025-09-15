import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";

export const config = { runtime: "nodejs" }; // chạy Node runtime ổn định

const BUCKET = "properties";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Tránh mọi import/khởi tạo khi không phải POST
  if (req.method !== "POST") return res.status(405).end();

  try {
    // --- Import động để an toàn CJS/ESM (không crash lúc load module) ---
    const [rateMod, turnstileMod, ipMod] = await Promise.all([
      import("../_lib/rate").catch(() => ({} as any)),
      import("../_lib/turnstile").catch(() => ({} as any)),
      import("../_lib/ipblock").catch(() => ({} as any)),
    ]);
    const guardRate =
      (rateMod as any).guardRate ?? (rateMod as any).default;
    const verifyTurnstile =
      (turnstileMod as any).verifyTurnstile ?? (turnstileMod as any).default;
    const ensureNotBlocked =
      (ipMod as any).ensureNotBlocked ?? (ipMod as any).default;

    // --- Các guard giữ nguyên logic cũ ---
    if (ensureNotBlocked) await ensureNotBlocked(req);
    if (guardRate) await guardRate(req, "signed_upload", 20, "60 seconds");

    // Parse body an toàn
    const body = typeof req.body === "string" ? safeJson(req.body) : (req.body || {});
    const { path, turnstileToken, contentType } = body as {
      path?: string; turnstileToken?: string; contentType?: string;
    };

    if (!path || typeof path !== "string") {
      return res.status(400).json({ error: "path required" });
    }
    if (path.startsWith("/") || path.includes("..") || path.includes("//")) {
      return res.status(400).json({ error: "invalid path" });
    }
    if (contentType) {
      const ok = new Set(["image/jpeg", "image/png", "image/webp", "image/avif"]);
      if (!ok.has(contentType)) return res.status(415).json({ error: "Unsupported contentType" });
    }

    // --- Turnstile (bypass an toàn cho dev/local) ---
    const fwd = req.headers["x-forwarded-for"];
    const ip = String(Array.isArray(fwd) ? fwd[0] : (fwd || ""));
    const shouldBypass =
      String(process.env.BYPASS_TURNSTILE).toLowerCase() === "true" ||
      String(process.env.VITE_ENV).toLowerCase() === "development" ||
      String(process.env.NODE_ENV).toLowerCase() === "development" ||
      !process.env.TURNSTILE_SECRET; // thiếu secret → coi như dev

    if (!shouldBypass && verifyTurnstile) {
      const vr = await verifyTurnstile(turnstileToken, ip);
      if (!vr?.ok) return res.status(400).json({ error: "BOT_DETECTED", code: vr?.code });
    }
    // --- end Turnstile ---

    // Lazy init Supabase (tránh crash khi ENV thiếu)
    const url = process.env.SUPABASE_URL;
    const srk = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !srk) {
      return res.status(500).json({
        error: "SERVER_MISCONFIG",
        missing: [!url && "SUPABASE_URL", !srk && "SUPABASE_SERVICE_ROLE_KEY"].filter(Boolean),
      });
    }
    const supa = createClient(url, srk, { auth: { persistSession: false } });

    // TTL 60s như cũ
    const { data, error } = await supa.storage.from(BUCKET).createSignedUploadUrl(path, { upsert: true });
    if (error) return res.status(400).json({ error: error.message });

    // Trả thêm key top-level 'signedUrl' để script dễ trích
    const signedUrl =
      (data as any)?.signedUrl ||
      (data as any)?.url ||
      (data as any)?.signed_url ||
      "";

    return res.status(200).json({ ...data, signedUrl, path }); // { signedUrl, token, path, ... }
  } catch (e: any) {
    return res.status(e?.status || 429).json({ error: e?.message || "RATE_LIMIT" });
  }
}

function safeJson(s: string) { try { return JSON.parse(s); } catch { return {}; } }

