import express from 'express';
import { sendPasswordResetEmail } from '../utils/mailer'; // Không cần .ts nếu dùng Node/ESM chuẩn

const router = express.Router();

router.post('/send-password-reset', async (req, res) => {
  const { email } = req.body;

  if (!email) return res.status(400).json({ error: 'Thiếu email' });

  try {
    const userName = 'Khách hàng'; // Lấy từ DB nếu có
    const newPassword = Math.random().toString(36).slice(-8); // 8 ký tự

    await sendPasswordResetEmail(email, userName, newPassword);

    console.log(`[API] Gửi lại mật khẩu cho: ${email} (pass: ${newPassword})`);

    res.status(200).json({
      message: 'Đã gửi email khôi phục'
      // Không trả password ra FE vì lý do bảo mật
    });
  } catch (error) {
    console.error('Email error:', error);
    res.status(500).json({ error: 'Không gửi được email' });
  }
});

export default router;