/**
 * Verification Script: Strict Whitelist Google Authentication
 * Verifies that ONLY the authorized administrator can obtain Admin access,
 * and any unauthorized account is blocked with HTTP 403 Forbidden.
 */
const { loginWithGoogle } = require('../services/auth.service');

async function run() {
  console.log('Testing Google Auth Verification...');

  // 1. Test Authorized User: suhani.yadavmicro@gmail.com
  try {
    const authResult = await loginWithGoogle({
      credential: 'demo_google_auth',
      ipAddress: '127.0.0.1',
      userAgent: 'Verification Agent',
    });

    if (authResult.user.email === 'suhani.yadavmicro@gmail.com' && authResult.user.role === 'ADMIN' && authResult.token) {
      console.log('✅ Check 1 PASSED: Authorized administrator verified with ADMIN privileges.');
    } else {
      console.error('❌ Check 1 FAILED: Unexpected user or role', authResult);
      process.exit(1);
    }
  } catch (err) {
    console.error('❌ Check 1 FAILED:', err);
    process.exit(1);
  }

  // 2. Test Unauthorized User (MUST BE REJECTED WITH 403)
  try {
    await loginWithGoogle({
      credential: 'demo_google_unauthorized',
      ipAddress: '127.0.0.1',
      userAgent: 'Verification Agent',
    });
    console.error('❌ Check 2 FAILED: Unauthorized user was NOT rejected!');
    process.exit(1);
  } catch (err) {
    if (err.statusCode === 403 && err.message.includes('not authorized')) {
      console.log('✅ Check 2 PASSED: Unauthorized Google account correctly blocked with HTTP 403 Forbidden.');
      console.log('   Rejection Notice:', err.message);
    } else {
      console.error('❌ Check 2 FAILED: Incorrect error response', err);
      process.exit(1);
    }
  }

  console.log('🎉 ALL GOOGLE AUTH CHECKS PASSED!');
}

run();
