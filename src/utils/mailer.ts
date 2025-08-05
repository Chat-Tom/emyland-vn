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

export async function sendPasswordResetEmail(to: string, resetLink: string) {
  const mailOptions = {
    from: EMAIL_FROM,
    to,
    subject: 'Khôi phục mật khẩu EmyLand.vn',
    html: `
      <h2>Khôi phục mật khẩu EmyLand.vn</h2>
      <p>Bạn (hoặc ai đó) vừa yêu cầu đặt lại mật khẩu. Nếu không phải bạn, hãy bỏ qua email này.</p>
      <p>Để tạo mật khẩu mới, vui lòng nhấp vào đường link sau:</p>
      <a href="${resetLink}" target="_blank" style="color:#1570EF;">Tạo mật khẩu mới</a>
      <p>Nếu bạn không nhấp được, sao chép và dán vào trình duyệt: <br/><b>${resetLink}</b></p>
      <p><i>Đường link chỉ có hiệu lực trong 15 phút.</i></p>
      <hr />
      <p>Trợ lý EmyLand</p>
    `
  };
  await transporter.sendMail(mailOptions);
}
