/**
 * Authentication Input Validation Schemas
 * Pravah V2 - Phase 2
 */

const { z } = require('zod');

const RoleEnum = z.enum(['ADMIN', 'CITIZEN', 'RESPONSE_TEAM', 'ANALYST']);

const registerSchema = z.object({
  email: z
    .string({ required_error: 'Email is required' })
    .email('Invalid email address format')
    .max(255, 'Email must not exceed 255 characters'),
  password: z
    .string({ required_error: 'Password is required' })
    .min(8, 'Password must be at least 8 characters long')
    .max(128, 'Password must not exceed 128 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  name: z
    .string({ required_error: 'Name is required' })
    .min(2, 'Name must be at least 2 characters long')
    .max(100, 'Name must not exceed 100 characters'),
  role: RoleEnum.optional().default('CITIZEN'),
});

const loginSchema = z.object({
  email: z
    .string({ required_error: 'Email or username is required' })
    .min(1, 'Email or username is required'),
  password: z
    .string({ required_error: 'Password is required' })
    .min(1, 'Password is required'),
});

module.exports = {
  RoleEnum,
  registerSchema,
  loginSchema,
};
