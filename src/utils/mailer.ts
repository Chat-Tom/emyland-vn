import nodemailer from 'nodemailer';

export const sendMail = async ({ to, subject, html }: { to: string, subject: string, html: string }) => {
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER, // emyland.vn@gmail.com
      pass: process.env.EMAIL_PASS, // app password
    },
  });

  await transporter.sendMail({
    from: `"EmyLand" <${process.env.EMAIL_USER}>`,
    to,
    subject,
    html,
  });
};
