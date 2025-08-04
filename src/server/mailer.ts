import nodemailer from 'nodemailer';

export const sendPasswordResetEmail = async (toEmail: string, userName: string, newPassword: string) => {
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: 'emyland.vn@gmail.com',
      pass: 'ysrxergbeamivrli', // chính là App Password
    },
  });

  const mailOptions = {
    from: '"Trợ lý EmyLand" <emyland.vn@gmail.com>',
    to: toEmail,
    subject: 'Khôi phục mật khẩu EmyLand.vn',
    html: `
      <div style="max-width:600px; margin:auto; padding:20px; font-family:Arial,sans-serif; background-color:#fff8f8; border:1px solid #f2c2c2; border-radius:8px;">
        <h2 style="color:#d62828;">Xin chào ${userName},</h2>
        <p>Bạn đã yêu cầu khôi phục mật khẩu cho tài khoản tại <a href="https://emyland.vn" style="color:#0077cc;">EmyLand.vn</a>.</p>
        <p><strong>Mật khẩu mới của bạn:</strong></p>
        <div style="background:#dff0d8; padding:12px 20px; border-radius:5px; font-size:18px; font-weight:bold; color:#333;">
          ${newPassword}
        </div>
        <p style="margin-top:20px;">Vui lòng đổi mật khẩu ngay sau khi đăng nhập lại để đảm bảo an toàn.</p>
        <hr/>
        <p style="font-size:13px; color:#888;">Email này được gửi từ hệ thống tự động. Vui lòng không trả lời lại.</p>
      </div>
    `,
  };

  await transporter.sendMail(mailOptions);
};
