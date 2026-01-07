# Security & Code Review Report

**Date:** 2026-01-07
**Reviewer:** Claude Code
**Project:** Task Helper

---

## Overview

Full-stack application review for security, best practices, and efficiency.

- **Frontend:** Angular 19 (Vercel)
- **Backend:** Node.js/Express with Prisma ORM (Fly.io)
- **Database:** PostgreSQL

---

## Critical Issues

### 1. Credentials Exposed in .env File

**Location:** `backend/.env:20-22`

```
CRM_EMAIL=vanya.okhrimenko@gmail.com
CRM_PASSWORD=Hzljdjq11
```

**Risk:** Credential exposure if repo is public or accessed by unauthorized parties.

**Fix:**
- [ ] Remove credentials from .env file
- [ ] Ensure .env is in .gitignore
- [ ] Use environment variables in deployment platform (Fly.io secrets)
- [ ] Rotate the exposed password immediately

---

### 2. Weak JWT Secret Fallback

**Location:**
- `backend/src/middleware/auth.middleware.ts:19`
- `backend/src/controllers/auth.controller.ts:30,65`

```typescript
process.env.JWT_SECRET || 'secret'
```

**Risk:** In production, if JWT_SECRET is missing, tokens are signed with 'secret' - easily guessable.

**Fix:**
- [ ] Remove the fallback `|| 'secret'`
- [ ] Add startup validation to require JWT_SECRET
- [ ] Use a strong, random secret (32+ characters)

```typescript
// Recommended: Add to backend/src/index.ts
if (!process.env.JWT_SECRET) {
  console.error('FATAL: JWT_SECRET environment variable is required');
  process.exit(1);
}
```

---

## Medium Priority Issues

### 3. XSS Risk in Chat Component

**Location:** `frontend/src/app/features/chat/chat.component.ts:142,158`

```typescript
[innerHTML]="formatMessage(message.content)"
```

**Risk:** AI-generated or manipulated content could execute malicious scripts.

**Fix:**
- [ ] Use Angular's DomSanitizer for stricter sanitization
- [ ] Consider using a markdown library with XSS protection (e.g., marked with DOMPurify)

```typescript
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

formatMessage(content: string): SafeHtml {
  // ... existing formatting logic ...
  return this.sanitizer.bypassSecurityTrustHtml(formatted);
}
```

---

### 4. Plain Text CRM Passwords in Database

**Location:** `backend/prisma/schema.prisma:82`

```prisma
password String // CRM login password (TODO: encrypt in production)
```

**Risk:** Database breach exposes all CRM credentials.

**Fix:**
- [ ] Implement application-level encryption for CRM passwords
- [ ] Use a library like `crypto` or `@aws-sdk/client-kms`

---

### 5. No Rate Limiting on Auth Endpoints

**Risk:** Brute force attacks on login/register endpoints.

**Fix:**
- [ ] Install and configure `express-rate-limit`

```typescript
import rateLimit from 'express-rate-limit';

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per window
  message: { error: 'Too many attempts, please try again later' }
});

app.use('/api/auth', authLimiter, authRoutes);
```

---

## Low Priority Issues

### 6. Debug Logging in CRM Service

**Location:** `backend/src/services/crm.service.ts:402-414`

**Issue:** Extensive console.log with sensitive data (cookies, form fields).

**Fix:**
- [ ] Replace console.log with structured logger (e.g., pino, winston)
- [ ] Use log levels (debug, info, warn, error)
- [ ] Remove or mask sensitive data from logs

---

### 7. Deprecated Fields in Schema

**Location:** `backend/prisma/schema.prisma`

```prisma
address String?        // @deprecated
clientAddress String?  // @deprecated
```

**Fix:**
- [ ] Plan migration to remove deprecated fields
- [ ] Update all code references to use new split fields
- [ ] Create migration to drop deprecated columns

---

### 8. Missing Comprehensive Input Validation

**Issue:** Controllers only check field presence, not format/content.

**Fix:**
- [ ] Add Zod or Joi for schema validation
- [ ] Validate email format, password strength, etc.

---

## Already Implemented (Good Practices)

- [x] CORS configured with specific origins
- [x] bcrypt for password hashing (salt rounds: 10)
- [x] User ownership validation on all operations
- [x] Graceful shutdown handling
- [x] Prisma parameterized queries (SQL injection protected)
- [x] Proper database indexes for common queries
- [x] JWT token expiration (7 days)
- [x] Secure password comparison with bcrypt.compare

---

## Action Checklist

### Before Production Deployment

- [ ] Remove credentials from .env, use Fly.io secrets
- [ ] Remove JWT_SECRET fallback, add startup validation
- [ ] Add rate limiting to auth endpoints
- [ ] Encrypt CRM passwords in database

### Soon After

- [ ] Add XSS protection to chat component
- [ ] Replace console.log with structured logging
- [ ] Add comprehensive input validation

### Technical Debt

- [ ] Remove deprecated schema fields
- [ ] Add unit tests for auth flows
- [ ] Add API documentation

---

## Commands to Fix Critical Issues

```bash
# 1. Set Fly.io secrets (instead of .env)
fly secrets set JWT_SECRET="$(openssl rand -base64 32)"
fly secrets set CRM_EMAIL="your-email@example.com"
fly secrets set CRM_PASSWORD="your-password"

# 2. Install rate limiting
cd backend && npm install express-rate-limit

# 3. Verify .env is in .gitignore
echo ".env" >> .gitignore
```

---

*This review was generated by Claude Code. Re-run `/verify` after fixes to confirm resolution.*
