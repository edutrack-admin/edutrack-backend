import nodemailer from 'nodemailer';

export const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST, // smtp-relay.brevo.com
  port: Number(process.env.EMAIL_PORT), // 587
  secure: false,
  auth: {
    user: process.env.EMAIL_USER, // apikey
    pass: process.env.EMAIL_PASS,
  },

  // 🔑 FORCE IPV4 (CRITICAL)
  family: 4,

  connectionTimeout: 10000,
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
