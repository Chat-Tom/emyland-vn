import nodemailer from 'nodemailer';

export async function sendResetEmail(email: string, resetLink: string) {
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER, // email của bạn
      pass: process.env.EMAIL_PASS, // app password
    },
  });

  await transporter.sendMail({
    from: '"Trợ lý EmyLand" <emyland.vn@gmail.com>',
    to: email,
    subject: 'Đặt lại mật khẩu EmyLand.vn',
    html: `
      <p>Xin chào,</p>
      <p>Bạn vừa yêu cầu đặt lại mật khẩu. Vui lòng bấm vào liên kết dưới đây để đổi mật khẩu mới:</p>
      <p><a href="${resetLink}" target="_blank">Đặt lại mật khẩu</a></p>
      <p>Nếu không phải bạn yêu cầu, hãy bỏ qua email này.</p>
      <hr>
      <p><small>Trân trọng, EmyLand.vn</small></p>
    `,
  });
}
