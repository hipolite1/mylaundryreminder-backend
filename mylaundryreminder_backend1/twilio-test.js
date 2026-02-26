require('dotenv').config();
const twilio = require('twilio');

const accountSid = process.env.accountSid;
const authToken = process.env.authToken;
const client = twilio(accountSid, authToken);
const TWILIO_NUMBER = process.env.TWILIO_NUMBER;

// Replace with your phone number for test
const TEST_NUMBER = '+16478654194';

async function sendTestSMS() {
  try {
    const message = await client.messages.create({
      body: 'Twilio test: This is a test SMS from MyLaundryReminder backend!',
      from: TWILIO_NUMBER,
      to: TEST_NUMBER
    });
    console.log('Test SMS sent successfully:', message.sid);
  } catch (e) {
    console.error('Failed to send test SMS:', e.message);
  }
}

sendTestSMS();