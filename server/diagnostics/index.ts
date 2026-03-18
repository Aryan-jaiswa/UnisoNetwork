import dotenv from 'dotenv';
import testDatabase from './dbTest';
import testJWT from './jwtTest';
import testEmail from './emailTest';
import testS3 from './s3Test';
import testAuth from './authTest';

// Load environment variables
dotenv.config({ path: '../../.env' });

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  bold: '\x1b[1m'
};

interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
}

async function runTest(name: string, testFn: () => Promise<boolean>): Promise<TestResult> {
  try {
    const passed = await testFn();
    if (passed) {
      console.log(`${colors.green}✅ ${name} Test Passed${colors.reset}`);
      return { name, passed: true };
    } else {
      console.log(`${colors.red}❌ ${name} Test Failed${colors.reset}`);
      return { name, passed: false, error: 'Test returned false' };
    }
  } catch (error: any) {
    const errorMessage = error?.message || 'Unknown error';
    console.log(`${colors.red}❌ ${name} Test Failed: ${errorMessage}${colors.reset}`);
    return { name, passed: false, error: errorMessage };
  }
}

async function runAllTests() {
  console.log(`\n${colors.blue}${colors.bold}🚀 Starting Uniso Diagnostics...${colors.reset}\n`);

  const tests = [
    { name: 'DB', fn: testDatabase },
    { name: 'JWT', fn: testJWT },
    { name: 'Email', fn: testEmail },
    { name: 'S3', fn: testS3 },
    { name: 'Auth', fn: testAuth }
  ];

  const results: TestResult[] = [];

  // Run all tests sequentially
  for (const test of tests) {
    results.push(await runTest(test.name, test.fn));
  }

  // Print summary block
  console.log(`\n${colors.blue}${colors.bold}📊 Diagnostics Summary${colors.reset}`);
  console.log('====================');
  
  for (const result of results) {
    const icon = result.passed ? '✅' : '❌';
    const color = result.passed ? colors.green : colors.red;
    console.log(`${color}${icon} ${result.name.padEnd(4)} OK${colors.reset}`);
  }
  
  console.log('====================');

  // Final status
  const allPassed = results.every(r => r.passed);
  const statusColor = allPassed ? colors.green : colors.red;
  const statusIcon = allPassed ? '🎉' : '⚠️';
  const statusMessage = allPassed ? 'All tests passed!' : 'Some tests failed!';
  
  console.log(`\n${statusColor}${statusIcon} ${statusMessage}${colors.reset}\n`);

  // Exit with appropriate code
  process.exit(allPassed ? 0 : 1);
}

// Run if called directly
if (require.main === module) {
  runAllTests().catch(error => {
    console.error(`${colors.red}Fatal error: ${error.message}${colors.reset}`);
    process.exit(1);
  });
}

export default runAllTests;
