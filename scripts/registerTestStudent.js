import dotenv from 'dotenv';

if (typeof fetch !== 'function') {
  throw new Error('Global fetch is unavailable. Please run with Node.js 18+ to use this script.');
}

dotenv.config();

const BASE_URL = (process.env.API_BASE_URL || 'http://localhost:5000/api').replace(/\/$/, '');

const randomStudentId = () => {
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const prefix = letters[Math.floor(Math.random() * letters.length)] + letters[Math.floor(Math.random() * letters.length)];
  const digits = Math.floor(10000000 + Math.random() * 90000000).toString();
  return `${prefix}${digits}`;
};

const [, , firstNameArg, lastNameArg, studentIdArg, passwordArg] = process.argv;

const studentId = (studentIdArg || randomStudentId()).toUpperCase();
const firstName = firstNameArg || 'Test';
const lastName = lastNameArg || 'Member';
const password = passwordArg || 'ChoirTest!123';
const email = `${studentId.toLowerCase()}@my.sliit.lk`;

const payload = {
  firstName,
  lastName,
  studentId,
  email,
  password,
  confirmPassword: password,
};

const logAndExit = (message, code = 0) => {
  console.log(message);
  process.exit(code);
};

const register = async () => {
  console.log(`\n▶ Registering ${studentId} at ${BASE_URL}...`);

  const response = await fetch(`${BASE_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    console.error('✗ Registration failed:', data.message || response.statusText);
    process.exit(1);
  }

  console.log('✓ Registration response:', data.message || 'Success');

  const requiresVerification = data.requiresVerification !== false;

  if (requiresVerification) {
    console.log('\nℹ Email verification is enabled. Check the mailbox for the OTP and verify manually.');
    console.log('   Student email:', email);
    return;
  }

  console.log('ℹ Email verification disabled. Completing flow automatically...');

  const verifyResponse = await fetch(`${BASE_URL}/auth/verify-email`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ studentId, otp: '000000' }),
  });

  const verifyData = await verifyResponse.json().catch(() => ({}));

  if (!verifyResponse.ok) {
    console.error('✗ Auto verification failed:', verifyData.message || verifyResponse.statusText);
    process.exit(1);
  }

  console.log('✓ Auto verification complete. Use the credentials below to login:');
  console.log('   StudentID:', studentId);
  console.log('   Password :', password);
};

register().catch((error) => {
  console.error('Unexpected error:', error.message || error);
  process.exit(1);
});
