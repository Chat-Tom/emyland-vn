import type { NextApiRequest, NextApiResponse } from 'next';
import { sendPasswordResetEmail } from '../../utils/mailer'; // CHUẨN
import { generateResetToken, saveResetToken } from '../../utils/resetTokenStore';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).end(); // Method Not Allowed
  }

  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ error: 'Thiếu email' });
  }

  // Tạo token và lưu lại (token tự sinh random)
  const token = generateResetToken(email);
  saveResetToken(token, email);

  // Link reset FE (FE phải có trang /reset-password)
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://emyland-vn.vercel.app';
  const resetLink = `${baseUrl}/reset-password?token=${token}`;

  try {
    await sendPasswordResetEmail(email, resetLink);
    return res.status(200).json({ message: 'Đã gửi email khôi phục mật khẩu!' });
  } catch (error) {
    console.error('Lỗi gửi email:', error);
    return res.status(500).json({ error: 'Gửi email thất bại. Vui lòng thử lại.' });
  }
}
