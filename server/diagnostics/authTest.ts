import dotenv from 'dotenv';
import axios from 'axios';

dotenv.config({ path: '../../.env' });

async function testAuth() {
  console.log('🔐 Testing Auth API...');
  
  try {
    const port = process.env.PORT || 3000;
    const baseUrl = `http://localhost:${port}`;
    const timestamp = new Date().getTime();
    const testEmail = `diagnostic+${timestamp}@gmail.com`;

    const response = await axios.post(`${baseUrl}/api/auth/register`, {
      email: testEmail,
      password: 'TestPassword123!',
      name: 'Diagnostic Test User'
    });

    if (response.data?.message?.includes('User registered')) {
      console.log('✅ Auth API test successful!');
      console.log('📝 Response:', response.data);
      return true;
    } else {
      throw new Error('Unexpected response format');
    }
  } catch (error: any) {
    console.log('❌ Auth API test failed!');
    console.error(error.response?.data || error.message);
    return false;
  }
}

if (require.main === module) {
  testAuth();
}

export default testAuth;
