// api/send-password-reset.ts
import crypto from "crypto";
import nodemailer from "nodemailer";
import { createClient } from "@supabase/supabase-js";

// Shim env EMAIL_* <-> SMTP_*
(() => {
  const map: [keyof NodeJS.ProcessEnv, keyof NodeJS.ProcessEnv][] = [
    ["SMTP_HOST", "EMAIL_HOST"],
    ["SMTP_PORT", "EMAIL_PORT"],
    ["SMTP_USER", "EMAIL_USER"],
    ["SMTP_PASS", "EMAIL_PASS"],
    ["SMTP_FROM", "EMAIL_FROM"],
  ];
  for (const [dst, src] of map) {
    if (!process.env[dst] && process.env[src]) (process.env as any)[dst] = process.env[src]!;
    if (!process.env[src] && process.env[dst]) (process.env as any)[src] = process.env[dst]!;
  }
  if (!process.env.SMTP_HOST) (process.env as any).SMTP_HOST = "smtp.gmail.com";
  if (!process.env.SMTP_PORT) (process.env as any).SMTP_PORT = "465";
  if (!process.env.SMTP_FROM && process.env.SMTP_USER) {
    (process.env as any).SMTP_FROM = `EmyLand <${process.env.SMTP_USER}>`;
  }
})();

const supabase =
  process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY
    ? createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
        auth: { persistSession: false },
      })
    : null;

const mailer = nodemailer.createTransport({
  host: process.env.SMTP_HOST!,
  port: Number(process.env.SMTP_PORT || 465),
  secure: true,
  auth: { user: process.env.SMTP_USER!, pass: process.env.SMTP_PASS! },
});

function frontendBase() {
  return (
    process.env.FRONTEND_URL ||
    process.env.NEXT_PUBLIC_BASE_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.VITE_PUBLIC_URL ||
    "http://localhost:5175"
  ).replace(/\/$/, "");
}

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { email } = (req.body || {}) as { email?: string };
  if (!email) return res.status(400).json({ error: "Thiếu email" });
  const normalized = email.toLowerCase();

  try {
    // 0) Nếu có Supabase: kiểm tra user có tồn tại
    if (supabase) {
      const { data: userRow, error: uErr } = await supabase
        .from("users")
        .select("email")
        .eq("email", normalized)
        .maybeSingle();

      if (uErr) {
        console.error("check user error:", uErr);
        return res.status(500).json({ error: "Lỗi hệ thống" });
      }

      // Không tồn tại user -> trả 200 để tránh lộ thông tin, KHÔNG chèn token, KHÔNG gửi mail
      if (!userRow) {
        return res.status(200).json({ message: "Đã gửi email khôi phục" });
      }
    }

    // 1) Tạo token thô + hash
    const raw = crypto.randomBytes(32).toString("hex");
    const token_hash = crypto.createHash("sha256").update(raw).digest("hex");
    const ttlMin = parseInt(process.env.RESET_TOKEN_TTL_MINUTES || "60", 10);
    const expires_at = new Date(Date.now() + ttlMin * 60 * 1000).toISOString();

    // 2) Lưu token (chỉ khi có Service Role & đã xác nhận tồn tại user)
    if (supabase) {
      await supabase.from("password_reset_tokens").delete().eq("email", normalized);
      const { error: insErr } = await supabase.from("password_reset_tokens").insert({
        email: normalized,
        token_hash,
        expires_at,
      });
      if (insErr) {
        console.error("insert token error:", insErr);
        return res.status(500).json({ error: "Không tạo được liên kết khôi phục" });
      }
    }

    // 3) Tạo link reset cho FE
    const url = `${frontendBase()}/reset-password?token=${raw}&email=${encodeURIComponent(normalized)}`;

    // 4) Gửi mail
    const from = process.env.SMTP_FROM || `EmyLand <${process.env.SMTP_USER}>`;
    await mailer.sendMail({
      from,
      to: normalized,
      subject: "EmyLand – Đặt lại mật khẩu",
      html: `
        <div style="font-family:Arial,sans-serif;font-size:16px;line-height:1.5">
          <p>Chào bạn,</p>
          <p>Bạn vừa yêu cầu đặt lại mật khẩu EmyLand.</p>
          <p><a href="${url}" style="display:inline-block;padding:12px 18px;border-radius:8px;text-decoration:none;background:#ff6a00;color:#fff">Tạo mật khẩu mới</a></p>
          <p>Nếu nút không bấm được, dán liên kết sau vào trình duyệt:<br>${url}</p>
          <p>Liên kết hết hạn sau ${ttlMin} phút.</p>
        </div>`,
      text: `Tạo mật khẩu mới tại: ${url}`,
      ...(process.env.SMTP_REPLY_TO ? { replyTo: process.env.SMTP_REPLY_TO } : {}),
    });

    return res.status(200).json({ message: "Đã gửi email khôi phục" });
  } catch (e: any) {
    console.error("send-password-reset error:", e?.message || e);
    return res.status(500).json({ error: "Không gửi được email" });
  }
}
