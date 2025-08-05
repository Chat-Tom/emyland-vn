import type { NextApiRequest, NextApiResponse } from 'next';
import { sendPasswordResetEmail } from '../utils/mailer';
import { generateResetToken, saveResetToken } from '../utils/resetTokenStore';
// import { getUserByEmail } from '../utils/userStore'; // Nếu cần check user tồn tại

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).end(); // Method Not Allowed
  }

  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ error: 'Thiếu email' });
  }

  // OPTIONAL: Kiểm tra nếu email không tồn tại (nếu có userStore)
  // const user = getUserByEmail(email);
  // if (!user) return res.status(404).json({ error: 'Email không tồn tại trong hệ thống' });

  // Sinh token reset ngẫu nhiên
  const token = generateResetToken(email);

  // Lưu token vào hệ thống (file, DB hoặc cache)
  saveResetToken(token, email);

  // Tạo link gửi người dùng (FE cần có trang /reset-password để xử lý)
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://emyland-vn.vercel.app';
  const resetLink = `${baseUrl}/reset-password?token=${token}`;

  // Gửi email khôi phục
  try {
    await sendPasswordResetEmail(email, resetLink);
    return res.status(200).json({ message: 'Đã gửi email khôi phục mật khẩu!' });
  } catch (error) {
    console.error('Lỗi gửi email:', error);
    return res.status(500).json({ error: 'Gửi email thất bại. Vui lòng thử lại.' });
  }
}
