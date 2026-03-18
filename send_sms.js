import dotenv from 'dotenv';
dotenv.config();
import twilio from 'twilio';

// Helper to mask sensitive strings for debug
function mask(s, keep = 4) {
  if (!s) return '[missing]';
  if (s.length <= keep) return s;
  return s.slice(0, keep) + '...' + s.slice(-keep);
}

const { TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM_NUMBER } = process.env;

// Debug: print loaded env (masked)
console.log('Loaded environment:');
console.log('TWILIO_ACCOUNT_SID =', mask(TWILIO_ACCOUNT_SID));
console.log('TWILIO_AUTH_TOKEN   =', mask(TWILIO_AUTH_TOKEN));
console.log('TWILIO_FROM_NUMBER  =', TWILIO_FROM_NUMBER ? TWILIO_FROM_NUMBER : '[missing]');
console.log('---');

if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_FROM_NUMBER) {
  console.error('❌ Twilio credentials not configured!');
  console.error('Please add these lines to a .env file in the same folder as send_sms.js:');
  console.error('TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxx');
  console.error('TWILIO_AUTH_TOKEN=xxxxxxxxxxxxxxxxxxxxxx');
  console.error('TWILIO_FROM_NUMBER=+1XXXXXXXXXX');
  process.exit(1);
}

const client = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);

async function sendSMS() {
  try {
    const message = await client.messages.create({
      body: 'Hello Arnav 🚀 This is a test SMS from Twilio!',
      from: TWILIO_FROM_NUMBER,
      to: '+918235524313' // your verified number
    });
    console.log(`✅ Message sent! SID: ${message.sid}`);
  } catch (err) {
    console.error('❌ Error sending SMS:');
    console.error(err);
  }
}

sendSMS();
