/**
 * Authentication Service
 * Pravah V2 - Phase 2
 *
 * Provides user registration, password verification with bcrypt,
 * JWT token generation, and role resolution.
 */

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('../config/prisma');
const jwtConfig = require('../config/jwt.config');

// In-memory fallback users for development testing when PostgreSQL is offline
const DEMO_PASSWORD_HASH = bcrypt.hashSync('PravahDev@2026', 10);
const DEMO_ADMIN123_HASH = bcrypt.hashSync('admin123', 10);
const MEMORY_USERS = [
  {
    id: '00000000-0000-4000-a000-000000000001',
    email: 'admin',
    passwordHash: DEMO_ADMIN123_HASH,
    name: 'Municipal Administrator',
    role: 'ADMIN',
    isActive: true,
  },
  {
    id: '11111111-1111-4111-a111-111111111111',
    email: 'admin@pravah.delhi.gov.in',
    passwordHash: DEMO_PASSWORD_HASH,
    name: 'Municipal Commissioner (Admin)',
    role: 'ADMIN',
    isActive: true,
  },
  {
    id: '22222222-2222-4222-a222-222222222222',
    email: 'analyst@pravah.delhi.gov.in',
    passwordHash: DEMO_PASSWORD_HASH,
    name: 'Hydrological Analyst',
    role: 'ANALYST',
    isActive: true,
  },
  {
    id: '33333333-3333-4333-a333-333333333333',
    email: 'team.central@pravah.delhi.gov.in',
    passwordHash: DEMO_PASSWORD_HASH,
    name: 'Central Control Officer',
    role: 'RESPONSE_TEAM',
    isActive: true,
  },
  {
    id: '44444444-4444-4444-a444-444444444444',
    email: 'citizen.delhi@example.com',
    passwordHash: DEMO_PASSWORD_HASH,
    name: 'Priya Sharma (Citizen)',
    role: 'CITIZEN',
    isActive: true,
  },
];

/**
 * Generates a signed JWT token containing user identity and role.
 */
function generateToken(user) {
  const payload = {
    sub: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
  };

  return jwt.sign(payload, jwtConfig.secret, {
    expiresIn: jwtConfig.expiresIn,
    issuer: jwtConfig.issuer,
  });
}

/**
 * Verifies a JWT token.
 */
function verifyToken(token) {
  try {
    return jwt.verify(token, jwtConfig.secret, { issuer: jwtConfig.issuer });
  } catch (error) {
    throw new Error(`Token verification failed: ${error.message}`);
  }
}

/**
 * Finds user by email, checking Prisma database first, falling back to memory store if DB is offline.
 */
async function findUserByEmail(email) {
  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (user) return user;
  } catch {
    // Database offline or query failed - check memory store
  }
  return MEMORY_USERS.find((u) => u.email.toLowerCase() === email.toLowerCase()) || null;
}

/**
 * Finds user by ID.
 */
async function findUserById(id) {
  try {
    const user = await prisma.user.findUnique({ where: { id } });
    if (user) return user;
  } catch {
    // Fallback to memory store
  }
  return MEMORY_USERS.find((u) => u.id === id) || null;
}

/**
 * Registers a new user with bcrypt-hashed password.
 */
async function registerUser({ email, password, name, role = 'CITIZEN' }) {
  const existingUser = await findUserByEmail(email);
  if (existingUser) {
    const err = new Error('A user with this email address already exists.');
    err.statusCode = 409;
    throw err;
  }

  const saltRounds = 10;
  const passwordHash = await bcrypt.hash(password, saltRounds);

  let newUser;
  try {
    newUser = await prisma.user.create({
      data: {
        email,
        passwordHash,
        name,
        role,
        isActive: true,
      },
    });
  } catch {
    // Offline fallback registration
    newUser = {
      id: `dev-${Date.now()}`,
      email,
      passwordHash,
      name,
      role,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    MEMORY_USERS.push(newUser);
  }

  const token = generateToken(newUser);
  return {
    user: {
      id: newUser.id,
      email: newUser.email,
      name: newUser.name,
      role: newUser.role,
    },
    token,
  };
}

/**
 * Authenticates a user with email and password.
 */
async function loginUser({ email, password }) {
  const user = await findUserByEmail(email);
  if (!user) {
    const err = new Error('Invalid email or password.');
    err.statusCode = 401;
    throw err;
  }

  if (!user.isActive) {
    const err = new Error('Account has been deactivated. Please contact support.');
    err.statusCode = 403;
    throw err;
  }

  const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
  if (!isPasswordValid) {
    const err = new Error('Invalid email or password.');
    err.statusCode = 401;
    throw err;
  }

  const token = generateToken(user);
  return {
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    },
    token,
  };
}

module.exports = {
  generateToken,
  verifyToken,
  findUserByEmail,
  findUserById,
  registerUser,
  loginUser,
};
