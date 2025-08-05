import type { NextApiRequest, NextApiResponse } from 'next';
import { sendPasswordResetEmail } from '../utils/mailer';
import { generateResetToken, saveResetToken } from '../utils/resetTokenStore';
// import { getUserByEmail } from '../utils/userStore'; // Nếu có check tồn tại user

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).end();
  }

  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ error: 'Thiếu email' });
  }

  // OPTIONAL: Check nếu user có tồn tại
  // const user = getUserByEmail(email);
  // if (!user) return res.status(404).json({ error: 'Email không tồn tại trong hệ thống' });

  // Tạo token và lưu lại (token tự sinh random)
  const token = generateResetToken(email);
  saveResetToken(token, email);

  // Tạo link cho phép người dùng đặt lại mật khẩu (đường dẫn reset-password trên FE)
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://emyland-vn.vercel.app';
  const resetLink = `${baseUrl}/reset-password?token=${token}`;

  // Gửi email reset
  try {
    await sendPasswordResetEmail(email, resetLink);
    return res.status(200).json({ message: 'Đã gửi email khôi phục mật khẩu!' });
  } catch (error) {
    return res.status(500).json({ error: 'Gửi email thất bại. Vui lòng thử lại.' });
  }
}
