import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';

dotenv.config({ path: '../../.env' });

async function testJWT() {
  console.log('🔑 Testing JWT Signing & Verification...');
  
  try {
    const payload = { userId: 123 };
    const secret = process.env.JWT_SECRET;
    
    if (!secret) {
      throw new Error('JWT_SECRET not found in environment variables');
    }

    const token = jwt.sign(payload, secret, { expiresIn: '1h' });
    console.log('📝 Signed Token:', token);

    const verified = jwt.verify(token, secret) as { userId: number };
    console.log('✅ JWT verification successful!');
    console.log('📦 Decoded payload:', verified);
    return true;
  } catch (error: any) {
    console.log('❌ JWT test failed!');
    console.error(error.message);
    return false;
  }
}

if (require.main === module) {
  testJWT();
}

export default testJWT;
