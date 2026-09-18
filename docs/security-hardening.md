# Pravah V2 — Security Hardening & OWASP Compliance (Phase 13)

This document details the security controls, OWASP Top 10 mitigation strategies, rate limiting parameters, input sanitization routines, and security audit logging implemented in Pravah V2.

---

## 1. OWASP Top 10 Security Architecture Matrix

| OWASP Vulnerability | Pravah V2 Defense Implementation | Verification Status |
| :--- | :--- | :--- |
| **A01: Broken Access Control** | Centralized `authenticate` and `authorize(allowedRoles)` middleware. Strict RBAC protecting `/api/admin/*`, dispatch assignments, and audit logs. | Verified (401 on unauthenticated, 403 on role mismatch) |
| **A02: Cryptographic Failures** | Bcrypt password hashing (cost factor 10). Cryptographically signed JWT tokens with 24h expiration and issuer validation. Zero plaintext secret storage. | Verified (Tokens validated on all secured routes) |
| **A03: Injection** | Strict parameterization via Prisma ORM (`$queryRaw` parameterized template tags). Zero dynamic SQL string concatenation. Strict Zod type validation. | Verified (SQL and NoSQL injection attempts thwarted) |
| **A04: Insecure Design** | Rate limiting layers protecting against brute-force password guessing and complaint spam flood attacks. | Verified (Returns 429 Too Many Requests) |
| **A05: Security Misconfiguration** | OWASP HTTP security headers configured via `helmet`: Content-Security-Policy (CSP), Strict-Transport-Security (HSTS), `nosniff`, and clickjacking defense. | Verified (Headers present on all HTTP responses) |
| **A07: Authentication Failures** | IP-based rate limiting on `/api/auth/login` and `/api/auth/register` (max 15 attempts / 15 minutes). Password verification using constant-time comparisons. | Verified |
| **A08: Software & Data Integrity** | Recursive XSS sanitization middleware stripping `<script>`, `<iframe>`, and event-handler injections before persistence. | Verified (Tags stripped clean from text fields) |
| **A09: Logging & Monitoring Failures** | Dedicated `audit.service.js` recording all administrative actions, drainage adjustments, and authorization failures into immutable audit logs. | Verified (Captured in `/api/admin/audit-logs`) |
| **Error Leakage / Info Disclosure** | Centralized error handler sanitizes internal database errors and stack traces before responding to clients. | Verified (Clean JSON without system path leakage) |

---

## 2. Rate Limiting Parameters

Configured via `express-rate-limit`:

| Route Scope | Window | Max Requests | Purpose |
| :--- | :--- | :--- | :--- |
| `/api/auth/login`, `/api/auth/register` | 15 minutes | 15 requests | Brute-force & credential stuffing defense |
| `/api/complaints` (POST) | 15 minutes | 30 submissions | Public citizen spam & report flooding defense |
| `/api/*` (General API) | 15 minutes | 600 requests | API exhaustion and volumetric DDoS protection |

When a client breaches a threshold, the server returns HTTP 429:
```json
{
  "error": "Too Many Requests",
  "message": "Too many authentication attempts from this IP. Please try again after 15 minutes.",
  "retryAfterMinutes": 15
}
```

---

## 3. Administrative Control & Audit Logging Endpoints

### 3.1 `GET /api/admin/overview`
- **Access**: `ADMIN`, `ANALYST`
- **Description**: Returns all municipal wards sorted by current risk score descending.

### 3.2 `POST /api/admin/update-drainage`
- **Access**: `ADMIN` only
- **Body**: `{ "wardId": "W056", "drainageCapacity": 68.0, "reason": "Desilting completed" }`
- **Audit Action**: Logs `DRAINAGE_CAPACITY_UPDATED` with administrator identity, IP address, and previous/new capacity values.

### 3.3 `GET /api/admin/audit-logs`
- **Access**: `ADMIN` only
- **Description**: Returns immutable log trail of security events and administrative modifications.

### 3.4 `GET /api/admin/security/posture`
- **Access**: `ADMIN` only
- **Description**: Returns real-time audit report of active security controls and OWASP hardening status.
