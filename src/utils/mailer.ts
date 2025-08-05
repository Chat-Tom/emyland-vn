import nodemailer from 'nodemailer';

const EMAIL_USER = process.env.EMAIL_USER;
const EMAIL_PASS = process.env.EMAIL_PASS;
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
  await transporter.sendMail(mailOptions);
}
