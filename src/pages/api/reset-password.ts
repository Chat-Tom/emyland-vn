import type { NextApiRequest, NextApiResponse } from 'next';
import { getEmailByToken, removeToken } from '../utils/resetTokenStore'; // CHUẨN: api ở gốc, utils ở src/utils

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end();

  const { token, newPassword } = req.body;
  if (!token || !newPassword) return res.status(400).json({ error: 'Thiếu dữ liệu' });

  const email = getEmailByToken(token);
  if (!email) return res.status(400).json({ error: 'Token không hợp lệ hoặc đã hết hạn' });

  // TODO: Cập nhật password của user vào DB thực tế tại đây

  removeToken(token);
  return res.status(200).json({ message: 'Đặt lại mật khẩu thành công!' });
}
