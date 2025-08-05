// /api/reset-password.ts

import { NextApiRequest, NextApiResponse } from 'next';
import { getEmailByToken, removeToken } from '../utils/resetTokenStore';
// import { updateUserPassword } from '../utils/userStore'; // Tuỳ logic của Tom

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Phương thức không được hỗ trợ' });
  }

  const { token, newPassword } = req.body;

  // Validate đầu vào
  if (!token || typeof token !== 'string' || !newPassword || typeof newPassword !== 'string') {
    return res.status(400).json({ error: 'Thiếu dữ liệu hoặc dữ liệu không hợp lệ' });
  }

  // Xác thực token và lấy email
  const email = getEmailByToken(token);
  if (!email) {
    return res.status(400).json({ error: 'Token không hợp lệ hoặc đã hết hạn. Vui lòng yêu cầu lại.' });
  }

  try {
    // TODO: Cập nhật mật khẩu cho user theo hệ thống lưu trữ của Tom
    // Ví dụ với file/DB/localStorage:
    // await updateUserPassword(email, newPassword);

    // (DEMO) Log ra để xác nhận - Tom thay bằng code thực tế
    console.log(`[RESET-PASSWORD] Đặt lại mật khẩu cho ${email} => ${newPassword}`);

    // Xoá token sau khi đổi mật khẩu thành công
    removeToken(token);

    return res.status(200).json({ message: 'Đặt lại mật khẩu thành công! Bạn có thể đăng nhập bằng mật khẩu mới.' });
  } catch (error) {
    console.error('[RESET-PASSWORD][ERROR]:', error);
    return res.status(500).json({ error: 'Có lỗi xảy ra. Vui lòng thử lại.' });
  }
}
