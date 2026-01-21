import axios from 'axios';

/**
 * Send email via Brevo HTTP API
 */
export async function sendEmail({ to, subject, html }) {
  try {
    await axios.post(
      'https://api.brevo.com/v3/smtp/email',
      {
        sender: { email: 'edutrack.adm@gmail.com', name: 'EduTracker Admin' },
        to: [{ email: to }],
        subject,
        htmlContent: html,
      },
      {
        headers: {
          'api-key': process.env.BREVO_API_KEY,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (err) {
    console.error('Email sending failed:', err.response?.data || err.message);
    throw err;
  }
}

/**
 * Returns the HTML for account created email
 */
export function accountCreatedEmail({ fullName, email, tempPassword, userType }) {
  return `
    <div style="font-family: Arial, sans-serif; line-height: 1.6">
      <h2>Welcome to EduTracker</h2>
      <p>Hello <strong>${fullName}</strong>,</p>
      <p>Your <strong>${userType}</strong> account has been created.</p>
      <ul>
        <li>Email: ${email}</li>
        <li>Temporary Password: ${tempPassword}</li>
      </ul>
      <p>Please log in and change your password immediately.</p>
      <a href="https://edutrack-front-steel.vercel.app">EduTracker Login</a>
      <hr />
      <small>This is an automated email. Do not reply.</small>
    </div>
  `;
}
