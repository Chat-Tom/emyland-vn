import type { NextApiRequest, NextApiResponse } from 'next';
import { getEmailByToken, removeToken } from '../utils/resetTokenStore';
// import { updateUserPassword } from '../utils/userStore'; // Tùy hệ thống lưu user

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end(); // Method Not Allowed

  const { token, newPassword } = req.body;

  if (!token || !newPassword) {
    return res.status(400).json({ error: 'Thiếu token hoặc mật khẩu mới' });
  }

  // Lấy email từ token đã lưu trước đó
  const email = getEmailByToken(token);

  if (!email) {
    return res.status(400).json({ error: 'Token không hợp lệ hoặc đã hết hạn' });
  }

  // ⚠️ Tùy hệ thống, thêm logic cập nhật mật khẩu tại đây
  // await updateUserPassword(email, newPassword); // => bcrypt hash + lưu lại

  // ✅ Sau khi đặt lại mật khẩu thành công → xóa token
  removeToken(token);

  return res.status(200).json({ message: 'Đặt lại mật khẩu thành công!' });
}
