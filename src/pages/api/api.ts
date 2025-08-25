// src/pages/api/api.ts (Express router)
import express from 'express';
import { sendPasswordResetEmail } from '../utils/mailer'; // Giữ nguyên import util (nếu util hỗ trợ gửi link sẽ dùng; nếu không mình fallback qua nodemailer)

// >>> Added: shim env EMAIL_* <-> SMTP_* + default
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

// >>> Optional: export sẵn client/mailer dùng chung (không ảnh hưởng code cũ)
import { createClient } from "@supabase/supabase-js";
import nodemailer from "nodemailer";
import crypto from "crypto";

export const supabaseAdmin =
  (global as any).__supabaseAdmin ||
  ((global as any).__supabaseAdmin = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  ));

export const mailer =
  (global as any).__mailer ||
  ((global as any).__mailer = nodemailer.createTransport({
    host: process.env.SMTP_HOST!,
    port: Number(process.env.SMTP_PORT || 465),
    secure: true,
    auth: { user: process.env.SMTP_USER!, pass: process.env.SMTP_PASS! },
  }));

const router = express.Router();

// Helper: gửi email reset link (ưu tiên util cũ nếu hỗ trợ, fallback sang nodemailer)
async function sendResetLink(to: string, resetUrl: string) {
  const from = process.env.SMTP_FROM || `EmyLand <${process.env.SMTP_USER}>`;

  // Thử gọi util cũ: một số dự án đặt tên hàm giống nhau nhưng cho phép truyền link
  try {
    const maybe = (sendPasswordResetEmail as unknown) as (to: string, name: string, link: string) => Promise<any>;
    if (typeof maybe === 'function') {
      await maybe(to, 'Khách hàng', resetUrl);
      return;
    }
  } catch { /* ignore and fallback */ }

  // Fallback: gửi trực tiếp bằng nodemailer
  await mailer.sendMail({
    from,
    to,
    subject: "EmyLand – Đặt lại mật khẩu",
    html: `
      <div style="font-family:Arial,sans-serif;font-size:16px;line-height:1.5">
        <p>Chào bạn,</p>
        <p>Bạn vừa yêu cầu đặt lại mật khẩu EmyLand.</p>
        <p><a href="${resetUrl}" style="display:inline-block;padding:12px 18px;border-radius:8px;text-decoration:none;background:#ff6a00;color:#fff">Tạo mật khẩu mới</a></p>
        <p>Nếu nút không bấm được, sao chép liên kết sau và dán vào trình duyệt:<br>${resetUrl}</p>
        <p>Liên kết hết hạn trong ${
          parseInt(process.env.RESET_TOKEN_TTL_MINUTES || '60', 10)
        } phút. Nếu không phải bạn, hãy bỏ qua email này.</p>
        <p>— EmyLand</p>
      </div>
    `,
    text: `Tạo mật khẩu mới tại: ${resetUrl}`,
    ...(process.env.SMTP_REPLY_TO ? { replyTo: process.env.SMTP_REPLY_TO } : {}),
  });
}

router.post('/send-password-reset', async (req, res) => {
  const { email } = req.body as { email?: string };
  if (!email) return res.status(400).json({ error: 'Thiếu email' });

  try {
    // 1) Tạo token thô + hash
    const rawToken = crypto.randomBytes(32).toString('hex');
    const token_hash = crypto.createHash('sha256').update(rawToken).digest('hex');

    // 2) TTL & lưu vào Supabase (bảng public.password_reset_tokens)
    const ttlMin = parseInt(process.env.RESET_TOKEN_TTL_MINUTES || '60', 10);
    const expires_at = new Date(Date.now() + ttlMin * 60 * 1000).toISOString();

    // Xoá token cũ cho email để tránh rác
    await supabaseAdmin.from('password_reset_tokens').delete().eq('email', email.toLowerCase());
    const { error: insErr } = await supabaseAdmin.from('password_reset_tokens').insert({
      email: email.toLowerCase(),
      token_hash,
      expires_at,
    });
    if (insErr) {
      console.error('insert token error:', insErr);
      return res.status(500).json({ error: 'Không tạo được liên kết khôi phục' });
    }

    // 3) Tạo URL reset cho FE (ưu tiên FRONTEND_URL / NEXT_PUBLIC_*)
    const base =
      process.env.FRONTEND_URL ||
      process.env.NEXT_PUBLIC_BASE_URL ||
      process.env.NEXT_PUBLIC_SITE_URL ||
      process.env.VITE_PUBLIC_URL ||
      'http://localhost:5175';

    const resetUrl = `${base.replace(/\/$/, '')}/reset-password?token=${rawToken}&email=${encodeURIComponent(
      email.toLowerCase()
    )}`;

    // 4) Gửi email
    await sendResetLink(email, resetUrl);

    console.log(`[API] Gửi link đặt lại mật khẩu cho: ${email}`);
    return res.status(200).json({ message: 'Đã gửi email khôi phục' });
  } catch (error) {
    console.error('Email error:', error);
    return res.status(500).json({ error: 'Không gửi được email' });
  }
});

export default router;
