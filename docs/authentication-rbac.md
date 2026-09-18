# Pravah V2 — Authentication & Role-Based Access Control (Phase 2)

This document details the identity, authentication, and authorization architecture implemented in Pravah V2.

---

## 1. Overview & Security Principles

In Pravah V1, authentication was minimal and backend authorization was virtually nonexistent. Pravah V2 replaces this with a production-grade identity layer:
- **Stateless JWT Authentication**: Signed with HMAC-SHA256, 24-hour expiration, claims include user ID, email, name, and role.
- **Bcrypt Password Security**: Passwords hashed with 10 salt rounds. Plaintext passwords are never stored in the database or written to logs.
- **Strict Input Validation**: Payloads validated using **Zod** before reaching controller logic.
- **Role-Based Access Control (RBAC)**: Middleware guards restricting endpoint access strictly based on verified JWT role claims.
- **Express Security Hardening**: Helmet for HTTP security headers, configurable CORS, and standardized non-leaking error responses.

---

## 2. Roles & Permissions Matrix

Pravah V2 defines 4 operational roles:

| Role | Scope & Responsibilities | Example Permitted Endpoints |
| :--- | :--- | :--- |
| **`ADMIN`** | Municipal commissioner & system administrators. Full operational oversight. | `/api/test-rbac/admin`, all routes across all roles. |
| **`ANALYST`** | Hydrologists, data scientists. Access to simulation models, risk curves, weather feeds. | `/api/test-rbac/analyst`, `/api/forecasts`, `/api/simulations`. |
| **`RESPONSE_TEAM`** | Field quick response teams, pumping crew operators. | `/api/test-rbac/team`, `/api/incidents/dispatch`, `/api/assignments`. |
| **`CITIZEN`** | General public. Submitting geotagged complaints and viewing public ward risk. | `/api/test-rbac/citizen`, `/api/complaints`, `/api/wards`. |

---

## 3. Endpoints Specification

### 3.1 `POST /api/auth/register`
- **Access**: Public
- **Request Body**:
  ```json
  {
    "email": "user@delhi.gov.in",
    "password": "SecurePassword123",
    "name": "Arun Verma",
    "role": "CITIZEN"
  }
  ```
- **Validation Rules**:
  - `email`: valid RFC email format, max 255 chars
  - `password`: min 8 chars, at least 1 uppercase letter, at least 1 number
  - `name`: min 2 chars
  - `role`: optional (defaults to `CITIZEN`). Allowed: `ADMIN`, `ANALYST`, `RESPONSE_TEAM`, `CITIZEN`
- **Response (201 Created)**:
  ```json
  {
    "message": "User registered successfully.",
    "user": {
      "id": "uuid-v4",
      "email": "user@delhi.gov.in",
      "name": "Arun Verma",
      "role": "CITIZEN"
    },
    "token": "eyJhbGciOiJIUzI1NiIsIn..."
  }
  ```

---

### 3.2 `POST /api/auth/login`
- **Access**: Public
- **Request Body**:
  ```json
  {
    "email": "admin@pravah.delhi.gov.in",
    "password": "PravahDev@2026"
  }
  ```
- **Response (200 OK)**:
  ```json
  {
    "message": "Login successful.",
    "user": {
      "id": "uuid-v4",
      "email": "admin@pravah.delhi.gov.in",
      "name": "Municipal Commissioner (Admin)",
      "role": "ADMIN"
    },
    "token": "eyJhbGciOiJIUzI1NiIsIn..."
  }
  ```

---

### 3.3 `GET /api/auth/me`
- **Access**: Protected (Bearer token required)
- **Headers**:
  ```
  Authorization: Bearer <jwt-token>
  ```
- **Response (200 OK)**:
  ```json
  {
    "user": {
      "id": "uuid-v4",
      "email": "admin@pravah.delhi.gov.in",
      "name": "Municipal Commissioner (Admin)",
      "role": "ADMIN"
    }
  }
  ```

---

### 3.4 RBAC Test Endpoints (`/api/test-rbac/...`)
- `GET /api/test-rbac/admin` — Only accessible with `ADMIN` token (403 Forbidden for others).
- `GET /api/test-rbac/analyst` — Accessible by `ADMIN` and `ANALYST`.
- `GET /api/test-rbac/team` — Accessible by `ADMIN` and `RESPONSE_TEAM`.
- `GET /api/test-rbac/citizen` — Accessible by `ADMIN` and `CITIZEN`.

---

## 4. Automated Testing

Run the automated 20-point verification suite:
```bash
cd server
npm run verify:phase2
```

All checks validate:
- Zod schema validation (rejection of weak passwords, bad email formats)
- Bcrypt hashing & verification
- JWT signing, payload extraction, and tamper detection
- RBAC middleware barrier enforcement (403 on role mismatch)
- Live HTTP request-response flow against Express endpoints
