import nodemailer from 'nodemailer';

// Lấy biến môi trường từ hệ thống deploy (Vercel, v.v.)
const EMAIL_USER = process.env.EMAIL_USER;
const EMAIL_PASS = process.env.EMAIL_PASS || process.env['MẬT_KHẨU_EMAIL']; // Hỗ trợ cả hai loại biến
const EMAIL_FROM = process.env.EMAIL_FROM || EMAIL_USER;

if (!EMAIL_USER || !EMAIL_PASS) {
  throw new Error('Thiếu thông tin email hoặc mật khẩu ứng dụng trong biến môi trường');
}

export const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: EMAIL_USER,
    pass: EMAIL_PASS,
  },
});

/**
 * Gửi email cấp lại mật khẩu mới cho user (nếu cần gửi trực tiếp mật khẩu).
 * @param to Email người nhận
 * @param userName Tên hiển thị (có thể để mặc định nếu chưa có DB userName)
 * @param newPassword Mật khẩu mới
 */
export async function sendPasswordResetEmail(to: string, userName: string, newPassword: string) {
  const mailOptions = {
    from: EMAIL_FROM,
    to,
    subject: 'Khôi phục mật khẩu EmyLand.vn',
    html: `
      <h2>Xin chào ${userName},</h2>
      <p>Bạn vừa yêu cầu khôi phục mật khẩu cho tài khoản EmyLand.vn.</p>
      <p>Mật khẩu mới của bạn là:</p>
      <h3 style="color:#1570EF;">${newPassword}</h3>
      <p>Hãy đăng nhập và đổi lại mật khẩu ngay để đảm bảo an toàn!</p>
      <hr />
      <p><i>Đây là email tự động, vui lòng không phản hồi lại.</i></p>
    `
  };
  try {
    await transporter.sendMail(mailOptions);
  } catch (error) {
    console.error('SendPasswordResetEmail error:', error);
    throw error;
  }
}

/**
 * Gửi email chứa link đổi mật khẩu (chuẩn quốc tế, bảo mật hơn).
 * @param to Email người nhận
 * @param resetLink Đường link đổi mật khẩu (có token reset)
 */
export async function sendPasswordResetLink(to: string, resetLink: string) {
  const mailOptions = {
    from: EMAIL_FROM,
    to,
    subject: 'Yêu cầu đặt lại mật khẩu EmyLand.vn',
    html: `
      <h2>Khôi phục mật khẩu EmyLand.vn</h2>
      <p>Bạn vừa yêu cầu đặt lại mật khẩu cho tài khoản EmyLand.vn.</p>
      <p>Vui lòng nhấn vào link dưới đây để đặt lại mật khẩu mới:</p>
      <p><a href="${resetLink}" target="_blank">${resetLink}</a></p>
      <p>Nếu bạn không thực hiện yêu cầu này, vui lòng bỏ qua email này.</p>
      <hr />
      <p><i>Đây là email tự động, vui lòng không phản hồi lại.</i></p>
    `,
  };
  try {
    await transporter.sendMail(mailOptions);
  } catch (error) {
    console.error('SendPasswordResetLink error:', error);
    throw error;
  }
}

