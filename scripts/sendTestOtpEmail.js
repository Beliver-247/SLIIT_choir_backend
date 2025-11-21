import dotenv from 'dotenv';
import { sendVerificationEmail } from '../utils/emailService.js';

dotenv.config();

const [,, recipientArg, codeArg, nameArg] = process.argv;

if (!recipientArg) {
  console.error('Usage: node scripts/sendTestOtpEmail.js <recipient-email> [code] [name]');
  process.exit(1);
}

const recipient = recipientArg;
const code = codeArg || Math.floor(100000 + Math.random() * 900000).toString();
const name = nameArg || 'Choir Member';

(async () => {
  try {
    console.log(`Sending test OTP email to ${recipient} with code ${code}`);
    await sendVerificationEmail({ to: recipient, code, name });
    console.log('✓ Test email sent successfully');
  } catch (error) {
    console.error('✗ Failed to send test email:', error.message);
    process.exit(1);
  }
})();
