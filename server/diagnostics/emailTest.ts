import dotenv from 'dotenv';
import sgMail from '@sendgrid/mail';

dotenv.config({ path: '../../.env' });

const TO_EMAIL = 'bhardwajarnav3@gmail.com';

async function testEmail() {
  console.log('📧 Testing SendGrid Email...');
  
  try {
    const apiKey = process.env.SENDGRID_API_KEY;
    const fromEmail = process.env.FROM_EMAIL;
    
    if (!apiKey || !fromEmail) {
      throw new Error('SendGrid credentials not found in environment variables');
    }

    sgMail.setApiKey(apiKey);
    
    const msg = {
      to: TO_EMAIL,
      from: fromEmail,
      subject: 'Uniso Diagnostics ✅',
      text: 'Hello Bhardwaj Bhai 🚀 Your SendGrid email is working!',
      html: '<p>Hello Bhardwaj Bhai 🚀 Your SendGrid email is working!</p>',
    };

    const response = await sgMail.send(msg);
    console.log('✅ Email sent successfully!');
    console.log(`📤 Status Code: ${response[0].statusCode}`);
    return true;
  } catch (error: any) {
    console.log('❌ Email test failed!');
    console.error(error.message);
    return false;
  }
}

if (require.main === module) {
  testEmail();
}

export default testEmail;
