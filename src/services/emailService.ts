import nodemailer from 'nodemailer';

// Lazy initialization of transporter to prevent crashes if env vars are missing
let transporter: any = null;

const getTransporter = () => {
  if (!transporter) {
    const user = process.env.EMAIL_USER;
    const pass = process.env.EMAIL_PASS;

    if (!user || !pass) {
      console.warn('EMAIL_USER or EMAIL_PASS not set. Email invitations will be logged to console instead.');
      return null;
    }

    transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user,
        pass,
      },
    });
  }
  return transporter;
};

export const sendInviteEmail = async (email: string, name: string, role: string, token: string) => {
  const baseUrl = process.env.VITE_BASE_URL || process.env.APP_URL || 'http://localhost:3000';
  const inviteLink = `${baseUrl}/register?token=${token}`;

  const mailOptions = {
    from: `"Smart Campus Connection" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: `Welcome to Smart Campus Connection - Complete Your Registration`,
    html: `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
        <div style="background-color: #4f46e5; padding: 40px; text-align: center; border-radius: 12px 12px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 28px;">Welcome, ${name}!</h1>
        </div>
        <div style="background: #ffffff; padding: 40px; border: 1px solid #e5e7eb; border-radius: 0 0 12px 12px;">
          <p style="font-size: 16px; line-height: 1.6;">
            You have been added to the <strong>Smart Campus Connection</strong> platform as a <strong>${role}</strong>.
          </p>
          <p style="font-size: 16px; line-height: 1.6;">
            Our platform helps you stay connected with campus news, messages, and academic updates.
          </p>
          <div style="text-align: center; margin: 40px 0;">
            <a href="${inviteLink}" style="background-color: #4f46e5; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px; display: inline-block;">Complete Registration</a>
          </div>
          <p style="color: #6b7280; font-size: 14px;">
            This link will expire in 24 hours. If you did not expect this invitation, please ignore this email.
          </p>
          <hr style="border: 0; border-top: 1px solid #e5e7eb; margin: 30px 0;">
          <p style="color: #9ca3af; font-size: 12px; text-align: center;">
            &copy; 2026 Smart Campus Connection. All rights reserved.
          </p>
        </div>
      </div>
    `,
  };

  const activeTransporter = getTransporter();
  if (activeTransporter) {
    try {
      await activeTransporter.sendMail(mailOptions);
      console.log(`Invite email sent to ${email}`);
    } catch (error) {
      console.error('Error sending invite email:', error);
      throw error;
    }
  } else {
    console.log('--- EMAIL SIMULATION ---');
    console.log(`To: ${email}`);
    console.log(`Token: ${token}`);
    console.log(`Link: ${inviteLink}`);
    console.log('------------------------');
  }
};
