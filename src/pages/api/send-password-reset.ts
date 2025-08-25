// src/pages/api/send-password-reset.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { sendPasswordResetLink } from '../utils/mailer'; // Đúng đường dẫn (giữ nguyên)
import { generateResetToken, saveResetToken } from '../utils/resetTokenStore'; // Đúng đường dẫn (giữ nguyên)

// >>> Added: bắt buộc dùng Node runtime (Nodemailer không chạy ở Edge)
export const config = { runtime: 'nodejs' };

// >>> Added: shim map biến môi trường EMAIL_* <-> SMTP_* + mặc định cần thiết
(() => {
  const map: [keyof NodeJS.ProcessEnv, keyof NodeJS.ProcessEnv][] = [
    ['SMTP_HOST', 'EMAIL_HOST'],
    ['SMTP_PORT', 'EMAIL_PORT'],
    ['SMTP_USER', 'EMAIL_USER'],
    ['SMTP_PASS', 'EMAIL_PASS'],
    ['SMTP_FROM', 'EMAIL_FROM'],
  ];
  for (const [dst, src] of map) {
    if (!process.env[dst] && process.env[src]) (process.env as any)[dst] = process.env[src]!;
    if (!process.env[src] && process.env[dst]) (process.env as any)[src] = process.env[dst]!;
  }
  if (!process.env.SMTP_HOST) (process.env as any).SMTP_HOST = 'smtp.gmail.com';
  if (!process.env.SMTP_PORT) (process.env as any).SMTP_PORT = '465';
  if (!process.env.SMTP_FROM && process.env.SMTP_USER) {
    (process.env as any).SMTP_FROM = `EmyLand <${process.env.SMTP_USER}>`;
  }
  if (!process.env.FRONTEND_URL) {
    (process.env as any).FRONTEND_URL =
      process.env.NEXT_PUBLIC_BASE_URL ||
      process.env.NEXT_PUBLIC_SITE_URL ||
      process.env.VITE_PUBLIC_URL ||
      'http://localhost:5175';
  }
})();

// >>> Added: lưu token vào Supabase nếu có service role (không thay/không bỏ logic cũ)
import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin =
  process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY
    ? createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
        auth: { persistSession: false },
      })
    : null;

async function persistTokenToSupabase(email: string, rawToken: string) {
  if (!supabaseAdmin) return; // không có service role thì bỏ qua, vẫn chạy theo luồng cũ
  try {
    // xóa token cũ cùng email để tránh rác
    await supabaseAdmin.from('password_reset_tokens').delete().eq('email', email.toLowerCase());

    const token_hash = crypto.createHash('sha256').update(rawToken).digest('hex');
    const ttlMin = parseInt(process.env.RESET_TOKEN_TTL_MINUTES || '60', 10);
    const expires_at = new Date(Date.now() + ttlMin * 60 * 1000).toISOString();

    await supabaseAdmin.from('password_reset_tokens').insert({
      email: email.toLowerCase(),
      token_hash,
      expires_at,
    });
  } catch (e) {
    console.error('persist token (Supabase) error:', (e as any)?.message || e);
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).end();
  }

  const { email } = req.body as { email?: string };
  if (!email) {
    return res.status(400).json({ error: 'Thiếu email' });
  }

  try {
    // 1) Tạo token theo logic cũ & lưu store cũ (giữ nguyên)
    const token = generateResetToken(email);
    saveResetToken(token, email);

    // 2) (Bổ sung) Lưu thêm vào Supabase để chạy bền trên production/đa instance
    await persistTokenToSupabase(email, token);

    // 3) Tạo link reset cho FE
    const baseUrl =
      process.env.FRONTEND_URL ||
      process.env.NEXT_PUBLIC_BASE_URL ||
      process.env.NEXT_PUBLIC_SITE_URL ||
      process.env.VITE_PUBLIC_URL ||
      'http://localhost:5175';

    // UI hiện tại đang đọc param `token` là đủ (không cần email)
    const resetLink = `${baseUrl.replace(/\/$/, '')}/reset-password?token=${encodeURIComponent(token)}`;

    // 4) Gửi email theo util cũ (giữ nguyên)
    await sendPasswordResetLink(email, resetLink);

    return res.status(200).json({ message: 'Đã gửi email khôi phục mật khẩu!' });
  } catch (error) {
    console.error('Lỗi gửi email:', error);
    return res.status(500).json({ error: 'Gửi email thất bại. Vui lòng thử lại.' });
  }
}
