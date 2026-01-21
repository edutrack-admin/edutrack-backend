import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false, // MUST be false for 587
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },

  // 🔑 REQUIRED on Render
  tls: {
    rejectUnauthorized: false,
    minVersion: 'TLSv1.2',
  },

  // ⏱ Prevent Render from killing the connection
  connectionTimeout: 10000, // 10s
  greetingTimeout: 10000,
  socketTimeout: 10000,
});

/**
 * Send email helper
 */
export async function sendEmail({ to, subject, html }) {
  return transporter.sendMail({
    from: `"EduTracker Admin" <${process.env.EMAIL_USER}>`,
    to,
    subject,
    html,
  });
}
export function accountCreatedEmail({
  fullName,
  email,
  tempPassword,
  userType,
}) {
  return `
    <div style="font-family: Arial, sans-serif; line-height: 1.6">
      <h2>Welcome to EduTracker</h2>
      <p>Hello <strong>${fullName}</strong>,</p>

      <p>
        Your <strong>${userType}</strong> account has been created.
      </p>

      <p><strong>Login details:</strong></p>
      <ul>
        <li>Email: ${email}</li>
        <li>Temporary Password: ${tempPassword}</li>
      </ul>

      <p>
        Please log in and change your password immediately.
      </p>

      <p>
        Login here: <br />
        <a href="https://edutrack-front-steel.vercel.app">
          EduTracker Login
        </a>
      </p>

      <hr />
      <small>This is an automated email. Do not reply.</small>
    </div>
  `;
};
