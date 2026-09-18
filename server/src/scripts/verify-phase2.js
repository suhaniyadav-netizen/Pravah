/**
 * Comprehensive Phase 2 Verification Suite
 * Pravah V2 - Authentication & RBAC
 *
 * Validates:
 * 1. Zod input validation schemas
 * 2. Bcrypt password hashing & comparison
 * 3. JWT generation, verification, and tamper detection
 * 4. RBAC middleware permissions matrix
 * 5. Full HTTP request-response flow against Express endpoints
 */

const http = require('http');
const bcrypt = require('bcryptjs');
const app = require('../app');
const { registerSchema, loginSchema } = require('../schemas/auth.schema');
const { generateToken, verifyToken, loginUser, registerUser } = require('../services/auth.service');
const { authenticate, authorize } = require('../middlewares/auth.middleware');

let passedChecks = 0;
let totalChecks = 0;

function reportCheck(title, success, details = '') {
  totalChecks++;
  if (success) {
    passedChecks++;
    console.log(`  ✅ [PASS] ${title}`);
  } else {
    console.log(`  ❌ [FAIL] ${title} - ${details}`);
  }
}

async function runPhase2Verification() {
  console.log('================================================================');
  console.log('     PRAVAH V2 — PHASE 2 AUTHENTICATION & RBAC VERIFICATION      ');
  console.log('================================================================\n');

  // ---------------------------------------------------------------------------
  // Check 1: Zod Input Validation
  // ---------------------------------------------------------------------------
  console.log('1. Zod Input Validation:');
  const validReg = registerSchema.safeParse({
    email: 'newuser@example.com',
    password: 'ValidPassword1',
    name: 'New User',
    role: 'CITIZEN',
  });
  reportCheck('Valid registration payload accepted', validReg.success);

  const weakPasswordReg = registerSchema.safeParse({
    email: 'newuser@example.com',
    password: 'weak',
    name: 'New User',
  });
  reportCheck('Weak password rejected (< 8 chars)', !weakPasswordReg.success);

  const invalidEmailReg = registerSchema.safeParse({
    email: 'not-an-email',
    password: 'ValidPassword1',
    name: 'New User',
  });
  reportCheck('Malformed email address rejected', !invalidEmailReg.success);

  const validLogin = loginSchema.safeParse({
    email: 'admin@pravah.delhi.gov.in',
    password: 'PravahDev@2026',
  });
  reportCheck('Valid login payload accepted', validLogin.success);

  // ---------------------------------------------------------------------------
  // Check 2: Bcrypt Password Hashing
  // ---------------------------------------------------------------------------
  console.log('\n2. Bcrypt Password Hashing & Security:');
  const rawPassword = 'SecurePassword2026!';
  const hash = await bcrypt.hash(rawPassword, 10);
  reportCheck('Password successfully hashed with bcrypt', hash.startsWith('$2'));

  const matches = await bcrypt.compare(rawPassword, hash);
  reportCheck('Correct password matches hash', matches);

  const wrongMatches = await bcrypt.compare('WrongPassword', hash);
  reportCheck('Incorrect password rejected', !wrongMatches);

  // ---------------------------------------------------------------------------
  // Check 3: JWT Token Generation & Verification
  // ---------------------------------------------------------------------------
  console.log('\n3. JWT Token Generation & Tamper Detection:');
  const testUser = {
    id: 'test-uuid-1234',
    email: 'test@delhi.gov.in',
    name: 'Test Officer',
    role: 'ADMIN',
  };

  const token = generateToken(testUser);
  reportCheck('JWT token generated successfully', typeof token === 'string' && token.split('.').length === 3);

  const decoded = verifyToken(token);
  reportCheck('JWT token correctly decodes payload (sub, email, role)', decoded.sub === testUser.id && decoded.role === 'ADMIN');

  let tamperCaught = false;
  try {
    const tamperedToken = token.slice(0, -5) + 'AAAAA';
    verifyToken(tamperedToken);
  } catch {
    tamperCaught = true;
  }
  reportCheck('Tampered JWT token rejected', tamperCaught);

  // ---------------------------------------------------------------------------
  // Check 4: RBAC Middleware Unit Logic
  // ---------------------------------------------------------------------------
  console.log('\n4. RBAC Middleware Unit Logic:');
  const mockReqAdmin = { user: { role: 'ADMIN' } };
  const mockReqCitizen = { user: { role: 'CITIZEN' } };
  let adminNextCalled = false;
  let citizenBlocked = false;

  const adminGuard = authorize('ADMIN');
  adminGuard(mockReqAdmin, {}, () => {
    adminNextCalled = true;
  });
  reportCheck('ADMIN role granted access to admin guard', adminNextCalled);

  const mockRes = {
    status: (code) => ({
      json: () => {
        if (code === 403) citizenBlocked = true;
      },
    }),
  };
  adminGuard(mockReqCitizen, mockRes, () => {});
  reportCheck('CITIZEN role blocked (403 Forbidden) from admin guard', citizenBlocked);

  // ---------------------------------------------------------------------------
  // Check 5: Live HTTP Request-Response API Testing
  // ---------------------------------------------------------------------------
  console.log('\n5. Live HTTP Endpoint & Barrier Testing:');

  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  const baseUrl = `http://localhost:${port}`;

  try {
    // 5.1 Health check
    const healthRes = await fetch(`${baseUrl}/api/health`);
    const healthData = await healthRes.json();
    reportCheck('GET /api/health returns 200 and healthy status', healthRes.status === 200 && healthData.status === 'healthy');

    // 5.2 Login as ADMIN
    const adminLoginRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@pravah.delhi.gov.in',
        password: 'PravahDev@2026',
      }),
    });
    const adminData = await adminLoginRes.json();
    reportCheck('POST /api/auth/login (ADMIN) returns 200 and JWT', adminLoginRes.status === 200 && Boolean(adminData.token));
    const adminToken = adminData.token;

    // 5.3 Verify /api/auth/me
    const meRes = await fetch(`${baseUrl}/api/auth/me`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const meData = await meRes.json();
    reportCheck('GET /api/auth/me returns authenticated user identity', meRes.status === 200 && meData.user.role === 'ADMIN');

    // 5.4 Access admin test route with ADMIN token -> 200
    const adminRouteRes = await fetch(`${baseUrl}/api/test-rbac/admin`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    reportCheck('GET /api/test-rbac/admin with ADMIN token returns 200', adminRouteRes.status === 200);

    // 5.5 Login as CITIZEN
    const citizenLoginRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'citizen.delhi@example.com',
        password: 'PravahDev@2026',
      }),
    });
    const citizenData = await citizenLoginRes.json();
    const citizenToken = citizenData.token;
    reportCheck('POST /api/auth/login (CITIZEN) returns 200', citizenLoginRes.status === 200 && Boolean(citizenToken));

    // 5.6 Access admin test route with CITIZEN token -> 403 Forbidden
    const forbiddenRes = await fetch(`${baseUrl}/api/test-rbac/admin`, {
      headers: { Authorization: `Bearer ${citizenToken}` },
    });
    reportCheck('GET /api/test-rbac/admin with CITIZEN token returns 403 Forbidden', forbiddenRes.status === 403);

    // 5.7 Access citizen route with CITIZEN token -> 200 OK
    const citizenRouteRes = await fetch(`${baseUrl}/api/test-rbac/citizen`, {
      headers: { Authorization: `Bearer ${citizenToken}` },
    });
    reportCheck('GET /api/test-rbac/citizen with CITIZEN token returns 200', citizenRouteRes.status === 200);

    // 5.8 Register new citizen account
    const registerRes = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: `citizen.${Date.now()}@delhi.gov.in`,
        password: 'SecurePassword123',
        name: 'Amit Kumar',
      }),
    });
    const regData = await registerRes.json();
    reportCheck('POST /api/auth/register creates account & returns JWT', registerRes.status === 201 && Boolean(regData.token));
  } finally {
    server.close();
  }

  // ---------------------------------------------------------------------------
  // Summary
  // ---------------------------------------------------------------------------
  console.log('\n================================================================');
  console.log(`PHASE 2 VERIFICATION COMPLETE: ${passedChecks}/${totalChecks} checks passed.`);
  console.log('================================================================\n');

  if (passedChecks === totalChecks) {
    console.log('🎉 Phase 2 authentication & RBAC verification succeeded!\n');
    process.exit(0);
  } else {
    console.error('⚠️ Some Phase 2 checks failed.\n');
    process.exit(1);
  }
}

runPhase2Verification().catch((err) => {
  console.error('Fatal verification error:', err);
  process.exit(1);
});
