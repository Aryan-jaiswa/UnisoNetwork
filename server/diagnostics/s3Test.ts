import dotenv from 'dotenv';
import { S3Client, PutObjectCommand, ListObjectsCommand, GetObjectCommand } from '@aws-sdk/client-s3';

dotenv.config({ path: '../../.env' });

async function testS3() {
  console.log('☁️ Testing AWS S3...');
  
  try {
    const s3Client = new S3Client({
      region: process.env.AWS_REGION,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
      },
    });

    const bucketName = process.env.AWS_S3_BUCKET!;
    const testContent = 'Hello Bhardwaj Bhai 🚀 S3 working!';
    const filename = 'hello.txt';

    // Upload file
    console.log('📤 Uploading test file...');
    await s3Client.send(new PutObjectCommand({
      Bucket: bucketName,
      Key: filename,
      Body: testContent,
    }));

    // List bucket contents
    console.log('📋 Listing bucket contents...');
    const listResponse = await s3Client.send(new ListObjectsCommand({
      Bucket: bucketName,
    }));
    
    const fileExists = listResponse.Contents?.some(file => file.Key === filename);
    console.log(`🔍 hello.txt found in bucket: ${fileExists ? '✅' : '❌'}`);

    // Download and verify content
    console.log('📥 Downloading test file...');
    const getResponse = await s3Client.send(new GetObjectCommand({
      Bucket: bucketName,
      Key: filename,
    }));
    
    const downloadedContent = await getResponse.Body?.transformToString();
    const contentMatch = downloadedContent === testContent;
    
    console.log(`📄 Content verification: ${contentMatch ? '✅' : '❌'}`);
    console.log('Downloaded content:', downloadedContent);

    console.log('✅ S3 test completed successfully!');
    return true;
  } catch (error: any) {
    console.log('❌ S3 test failed!');
    console.error(error.message);
    return false;
  }
}

if (require.main === module) {
  testS3();
}

export default testS3;
