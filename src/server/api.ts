import express from 'express';
import { sendPasswordResetEmail } from './mailer.ts'; // ✅ Đã thêm đuôi .ts để đúng chuẩn ESM

const router = express.Router();

router.post('/send-password-reset', async (req, res) => {
  const { email } = req.body;

  if (!email) return res.status(400).json({ error: 'Thiếu email' });

  try {
    const userName = 'Khách hàng'; // hoặc lấy từ DB nếu có tên người dùng
    const newPassword = Math.random().toString(36).slice(-8); // random mật khẩu mới 8 ký tự

    await sendPasswordResetEmail(email, userName, newPassword);

    res.status(200).json({
      message: 'Đã gửi email khôi phục',
      password: newPassword // 👈 có thể ẩn đi nếu không muốn trả về
    });
  } catch (error) {
    console.error('Email error:', error);
    res.status(500).json({ error: 'Không gửi được email' });
  }
});

export default router;
