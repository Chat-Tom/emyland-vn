import { NextApiRequest, NextApiResponse } from 'next';
import { createResetToken } from '../utils/resetTokenStore'; // Tạo token lưu tạm
import { sendMail } from '../utils/mailer'; // Hàm gửi mail

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end();

  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Thiếu email' });

  // Kiểm tra user tồn tại trong hệ thống (nếu có DB user thì truy vấn tại đây)
  // const user = await getUserByEmail(email);
  // if (!user) return res.status(404).json({ error: 'Email không tồn tại' });

  // 1. Sinh token khôi phục
  const token = createResetToken(email);

  // 2. Link đặt lại mật khẩu (lấy từ biến môi trường base url FE hoặc hardcode cũng được)
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://emyland-vn.vercel.app';
  const resetLink = `${baseUrl}/reset-password?token=${token}`;

  // 3. Gửi mail link đặt lại mật khẩu
  await sendMail({
    to: email,
    subject: 'Khôi phục mật khẩu EmyLand.vn',
    html: `
      <p>Xin chào,</p>
      <p>Bạn vừa yêu cầu đặt lại mật khẩu tài khoản tại <b>EmyLand.vn</b>.</p>
      <p>Nhấn vào liên kết dưới đây để đổi mật khẩu mới:</p>
      <p><a href="${resetLink}">${resetLink}</a></p>
      <p>Nếu bạn không yêu cầu, hãy bỏ qua email này.</p>
      <hr>
      <small>Email này được gửi tự động, vui lòng không trả lời.</small>
    `
  });

  // 4. Chỉ trả kết quả chung, KHÔNG trả token, KHÔNG trả password ra FE!
  return res.status(200).json({
    message: 'Đã gửi email hướng dẫn khôi phục mật khẩu. Vui lòng kiểm tra hộp thư đến (hoặc cả Spam).'
  });
}
