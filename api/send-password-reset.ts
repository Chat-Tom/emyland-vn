import { VercelRequest, VercelResponse } from '@vercel/node';
import nodemailer from 'nodemailer';

// API route: POST /api/send-password-reset
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ error: 'Thiếu email' });
  }

  const userName = 'Khách hàng';
  const newPassword = Math.random().toString(36).slice(-8);

  try {
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER, // Lấy từ biến môi trường Vercel
        pass: process.env.EMAIL_PASS,
      },
    });

    await transporter.sendMail({
      from: `"Trợ lý EmyLand" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: 'Khôi phục mật khẩu EmyLand.vn',
      html: `
        <div style="font-family:Arial,sans-serif;padding:24px;border-radius:8px;background:#fff7f0">
          <h2 style="color:#d62828">Xin chào ${userName},</h2>
          <p>Bạn vừa yêu cầu khôi phục mật khẩu cho tài khoản EmyLand.vn.</p>
          <p><strong>Mật khẩu mới của bạn:</strong></p>
          <div style="background:#eefbe7;padding:12px 24px;border-radius:4px;display:inline-block;font-size:18px;margin:8px 0">
            ${newPassword}
          </div>
          <p style="margin-top:18px">Hãy đăng nhập và đổi lại mật khẩu ngay để đảm bảo an toàn.</p>
          <hr style="margin:24px 0"/>
          <div style="font-size:12px;color:#888">Đây là email tự động, vui lòng không phản hồi lại.</div>
        </div>
      `,
    });

    console.log(`[API] Đã gửi mail khôi phục cho: ${email} (mật khẩu mới: ${newPassword})`);
    res.status(200).json({ message: 'Đã gửi email khôi phục' });
  } catch (error) {
    console.error('Email error:', error);
    res.status(500).json({ error: 'Không gửi được email' });
  }
}
