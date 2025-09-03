// api/go.ts
import type { VercelRequest, VercelResponse } from "@vercel/node";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const ua = String(req.headers["user-agent"] || "").toLowerCase();

  // Nhận URL đích qua ?t=...
  let t = String(req.query.t || "");
  if (t && !/^https?:\/\//i.test(t)) {
    const host = req.headers.host || "emyland.vn";
    t = `https://${host}${t.startsWith("/") ? "" : "/"}${t}`;
  }

  // Heuristic: phát hiện bot/unfurlers → 204 No Content (không tạo preview)
  const isBot = /(bot|crawl|spider|slurp|facebookexternalhit|whatsapp|skype|twitterbot|slackbot|discord|telegram|zalo|link|preview|unfurl)/i.test(
    ua
  );

  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0");

  if (isBot) {
    return res.status(204).send("");
  }

  if (!t) return res.status(400).send("Missing t");

  res.status(302).setHeader("Location", t).end();
}
