# ResolveAI — Backend knowledge transfer

This is the TypeScript, Express 5, and MongoDB API for the ResolveAI support workspace. It implements authentication, refresh sessions, role checks, and ticket workflows. The frontend in `../frontend` consumes these contracts.

## 1. Plain-language overview

A ticket is a customer request. The API acts as the gatekeeper: it checks who is asking, checks what they are allowed to do, validates their input, reads or changes MongoDB, and returns a predictable JSON response.

Customer -> creates a request -> Admin assigns an agent -> Agent updates progress -> Customer follows the status.

AI analysis, automatic assignment, generated replies, notifications, WebSockets, attachments, comments, and RAG are not implemented. The existing product name should not be used as evidence of these features.

## 2. Setup

Use a Node.js version compatible with installed dependencies, npm, and local MongoDB or an Atlas connection you control.

```powershell
cd backend
npm.cmd ci
# Copy .env.example to .env and supply your own values.
npm.cmd run dev
```

```dotenv
PORT=5000
MONGODB_URI=mongodb://127.0.0.1:27017/resolve-ai
FRONTEND_URL=http://localhost:5173
JWT_ACCESS_SECRET=replace-with-a-long-random-access-secret
JWT_REFRESH_SECRET=replace-with-a-different-long-random-refresh-secret
NODE_ENV=development
```

Keep `.env` private. Never commit credentials or use the example secret strings in a deployed environment. `MONGODB_URI` should name the intended database; an unexpected database selection can make valid-looking login credentials appear unknown. `FRONTEND_URL` is the exact frontend origin, without a path.

```powershell
npm.cmd run build
npm.cmd start
```

Build compiles `src` to `dist`. Start runs the compiled server; rebuild after source changes. Development uses tsx watch. Check `GET /api/health` to confirm HTTP availability. That response is not a full dependency readiness or database integrity check.

## 3. Architecture and request lifecycle

```text
HTTP request
  -> app.ts: CORS, JSON parsing, cookie parsing
  -> route: match method + URL
  -> authenticate: verify bearer JWT, fetch active user
  -> authorizeRoles: check current database role
  -> validator: parse and normalize body/params/query
  -> controller: coordinate request and HTTP response
  -> service: business rules and database query
  -> Mongoose model -> MongoDB
  -> JSON response
```

Not every route uses every step: public login and registration use body validation without bearer authentication. Refresh and logout use the cookie rather than an access token. Errors reach the final error middleware. Express 5 forwards rejected async handlers to that middleware.

| Location | Purpose |
| --- | --- |
| `src/server.ts` | Load environment, connect database, listen |
| `src/app.ts` | Express app, shared middleware, mounted routes, error handling |
| `src/routes/` | HTTP contracts and middleware order |
| `src/controllers/` | Read request, invoke service, send status/JSON/cookie |
| `src/services/` | Authentication and ticket business/database logic |
| `src/models/` | User, Ticket, RefreshSession schemas |
| `src/validators/` | Zod input contracts |
| `src/middleware/auth.middleware.ts` | Bearer verification and current-user lookup |
| `src/middleware/role.middleware.ts` | Allowed role checks |
| `src/middleware/validate.middleware.ts` | Validated body/params and query locals |
| `src/types/express.d.ts` | Add optional typed req.user to Express Request |
| `src/utils/jwt.ts` | Signing, verification, hashing and token expiry helpers |
| `src/utils/authCookie.ts` | Refresh cookie attributes |
| `src/utils/AppError.ts` | Operational error with HTTP status |
| `src/config/ticket.controller.ts` | Legacy re-export of canonical ticket controllers |

Controllers handle HTTP details. Services handle application logic. Models describe stored documents. Keeping these separate makes changes and testing easier without tying every database operation to Express objects.

## 4. Authentication contracts

| Method + path | Input | Success |
| --- | --- | --- |
| POST `/api/auth/register` | name, email, password | 201; `data` contains safe user fields |
| POST `/api/auth/login` | email, password | 200; `data.user`, `data.accessToken`; refresh cookie |
| POST `/api/auth/refresh` | refreshToken cookie | 200; `data.accessToken`; rotated cookie |
| GET `/api/auth/me` | Bearer access token | 200; `data: { id, name, email, role }` |
| POST `/api/auth/logout` | refreshToken cookie, if present | 200; remove matching refresh session and clear cookie |

Register example:

```json
{ "name": "Alex Customer", "email": "alex@example.com", "password": "your-own-strong-password" }
```

Registration trims name/email, lowercases email, rejects unknown fields, checks name length 2–80 and password length =8 characters and =72 UTF-8 bytes, hashes the password using bcrypt with cost 12, and always sets role Customer. A duplicate email returns 409. Registration does not automatically authenticate.

Login compares the submitted password with the stored bcrypt hash. Passwords are excluded from normal user queries and explicitly selected for login. Missing accounts and password mismatch both return 401 “Invalid email or password”; inactive accounts return 403.

### Access and refresh tokens

Access tokens are signed with HS256 and expire after 15 minutes. Protected requests send:

```http
Authorization: Bearer <access-token>
```

The authentication middleware fetches the latest user from MongoDB and attaches safe fields to `req.user`. Therefore current activation and role information comes from the database, not exclusively from an old token claim.

Refresh tokens expire after seven days and contain a session ID. MongoDB stores a SHA-256 hash of the refresh token, not its raw value. A successful refresh checks the signature, matching session/hash, future `expiresAt`, and active user. It issues a new access token and rotates the refresh token with a unique JWT ID, then replaces the stored hash.

The refresh cookie is HttpOnly, scoped to `/api/auth`, and lasts seven days. Development uses SameSite=Lax without Secure; production uses SameSite=None and Secure, requiring HTTPS. The frontend must use credentials: include and the API must allow its exact origin with credentialed CORS. Browser third-party cookie rules can still block cross-site cookies.

MongoDB's TTL index eventually removes expired refresh sessions. Because TTL cleanup is asynchronous, the service also checks expiresAt at request time.

Logout deletes the matching refresh session and clears the cookie. Existing access JWTs are not individually revoked and can remain usable until expiry, provided the user remains active. Do not describe this as immediate revocation of every token or every device.

Opening refresh in a browser address bar sends GET. This API requires POST and returns 405 with Allow: POST for other methods.

## 5. Roles and ticket access

| Action | Customer | SupportAgent | Admin |
| --- | --- | --- | --- |
| Create ticket | Yes | No | Yes |
| List/read | Own tickets | Assigned tickets | All tickets |
| Update | No | Status only, assigned tickets | All editable fields |
| Assign agent | No | No | Yes |
| Delete | No | No | Yes |

All ticket routes require bearer authentication. Route role checks restrict the action; service query filters restrict which documents can be read/updated. Customer filters use `createdBy`; agent filters use `assignedTo`. Admin has no ownership restriction. A missing or inaccessible document returns 404 to avoid revealing another user's ticket.

Public registration cannot choose a role. The protected owner setup creates the first administrator; subsequent access comes from admin-generated invitations or admin-managed Customer/SupportAgent roles. The workspace API includes user listing and an active-agent directory. Choosing a sign-in portal does not grant privileges.

## 6. Ticket API

### Create — POST `/api/tickets`

```json
{
  "title": "Payment deducted but subscription inactive",
  "description": "My payment completed, but the subscription still shows inactive.",
  "category": "Billing",
  "priority": "High"
}
```

Returns 201 with `data` containing the ticket. Title is 3–150 characters; description is 10–2000. Strings are trimmed. Category is General, Billing, Technical, Account, or Subscription. Priority is Low, Medium, or High (default Medium). Unknown fields are rejected. The server controls createdBy and initially sets assignedTo to null and status to Open.

### List — GET `/api/tickets`

Example: `/api/tickets?page=1&limit=9&status=Open&priority=High&category=Billing&search=payment&sortBy=createdAt&order=desc`.

| Query | Allowed / default |
| --- | --- |
| page | Integer =1; default 1 |
| limit | Integer 1–100; default 10 |
| status | Open, In Progress, Resolved, Closed |
| priority | Low, Medium, High |
| category | Same category enum as creation |
| search | Trimmed text, maximum 100 characters |
| sortBy | createdAt, updatedAt, title; default createdAt |
| order | asc or desc; default desc |

Search matches title or description case-insensitively and escapes regular-expression metacharacters. Search does not remove the user's ownership/assignment filter. Records and count are queried concurrently.

```json
{
  "success": true,
  "message": "Tickets retrieved successfully",
  "data": [],
  "pagination": {
    "page": 1, "limit": 9, "total": 0, "totalPages": 0,
    "hasNextPage": false, "hasPreviousPage": false
  }
}
```

These are server-provided totals for the filtered, accessible dataset. There is no global analytics endpoint. Offset pagination is simple but may become expensive or shift during concurrent changes; cursor pagination is a future scaling option.

### Read — GET `/api/tickets/:id`

Requires a 24-character hexadecimal MongoDB ID. Returns 200 with one ticket, 400 for invalid ID format, or 404 if missing/inaccessible.

### Update — PATCH `/api/tickets/:id`

Admin accepts any nonempty subset of title, description, category, priority, status. Agent accepts only status and only on assigned tickets. A non-status agent update returns 403, rather than silently ignoring the submitted field. Unknown fields and empty updates fail validation. Mongoose update validators are enabled.

```json
{ "status": "In Progress" }
```

Statuses are Open, In Progress, Resolved, Closed. The current backend validates the enum but does not enforce a one-way transition state machine; reopening is possible.

### Assign — PATCH `/api/tickets/:id/assign`

Admin only. Request:

```json
{ "assignedTo": "507f1f77bcf86cd799439011" }
```

The target must be an active SupportAgent. The service assigns the ticket and populates creator/assignee name and email in its response. List, detail, and update reads also populate these references; clients still support raw IDs for responses such as creation. An invalid target or missing ticket returns 404. Unassignment and automatic assignment are not currently supported.

### Delete — DELETE `/api/tickets/:id`

Admin only. Permanently removes the ticket and returns the deleted record. There is no soft-delete or restore API; the frontend requires confirmation.

## 7. Data model

- **User:** name, unique normalized email, password hash, role, isActive, timestamps. Role defaults to Customer.
- **Ticket:** title, description, category, priority, status, required createdBy reference, nullable assignedTo reference, timestamps.
- **RefreshSession:** userId reference, unique tokenHash, expiresAt, timestamps; TTL expiry index.

IDs are references, not embedded full users. Population is used on assignment responses. Mongoose schemas and Zod validators serve different layers: Zod rejects invalid HTTP input before business logic; schema validation protects writes that reach MongoDB.

## 8. Errors and debugging

```json
{ "success": false, "message": "Validation failed", "errors": [{ "field": "title", "message": "Title must contain at least 3 characters" }] }
```

| Status | Typical meaning |
| --- | --- |
| 400 | Invalid payload, query, ID or Mongoose validation |
| 401 | Missing/expired authentication or invalid credentials |
| 403 | Inactive account or role/action denied |
| 404 | Unknown route, missing/inaccessible ticket, invalid assignment target |
| 405 | Unsupported method on refresh |
| 409 | Registration email already exists |
| 500 | Unexpected server failure |

The error middleware logs operational errors as ERROR too; a 401 stack does not mean the process crashed. Unknown route messages include HTTP method and path. Do not log bearer tokens, cookies, passwords, or connection strings while diagnosing issues.

For login failures, verify the selected database and normalized account email before changing password logic. For empty agent queues, verify assignment. For cookie problems, inspect origin, credentials, HTTPS, SameSite and browser policy. CORS config controls browser access; it is not a replacement for authentication or a complete CSRF defense.

## 9. Technical KT exercise

1. Start MongoDB and API, then check health.
2. Register and log in a Customer; save its bearer token and cookie in a local API client.
3. Create a ticket and read/list it.
4. Use protected owner setup for the first Admin and invite a SupportAgent through People & access.
5. Assign the ticket as Admin; verify the agent can now read it.
6. Update status as agent; verify agent priority edits and Customer updates return 403.
7. Verify a different Customer cannot retrieve that ID.
8. Refresh using POST and cookies; observe token rotation without sharing secret values.
9. Logout and verify the refresh session can no longer refresh.
10. Test malformed IDs, invalid enums, filter/pagination boundaries, and missing cookies.

Use a test database. Deletion is permanent. Browser testing remains necessary because API clients do not reproduce browser CORS and third-party cookie policy.

## 10. Interview explanation and tradeoffs

**Short explanation:** “I implemented an Express/TypeScript API for support tickets using MongoDB. Authentication combines bcrypt passwords, short-lived JWT access tokens, and rotating refresh sessions stored as hashes. Customers are restricted to their own tickets, agents to assigned tickets, and admins manage the entire queue. Zod validates request contracts and services apply authorization filters directly to database queries.”

**Authentication versus authorization?** Authentication answers who the caller is. Authorization checks which action and which record they can access. Both are needed.

**Why service-level filters?** Checking a role alone does not stop one Customer reading another Customer's ID. Combining `_id` with `createdBy` or `assignedTo` in a query enforces record access.

**Why not store plain passwords?** A bcrypt hash lets the server compare credentials without storing the original password. Hashing is one-way; encryption is designed to be reversible with a key.

**Why validate twice?** HTTP validation gives clear client feedback. Mongoose validation protects the storage layer. They are complementary.

**What TypeScript issues did you solve?** Express route params can be string or string array; schema parsing narrows IDs before service calls. Mongoose's installed version uses QueryFilter. Express Request is augmented for typed authenticated-user fields. Middleware callback scope and matching export names also matter.

**Where would you improve it?** Shared rate-limit storage, explicit startup configuration validation, refresh-family reuse detection, cross-tab handling, audit logs, pagination indexes, structured logging, and real-database/browser integration tests. These are next steps, not claims of existing functionality.

## 11. Production readiness boundaries

The current implementation is a functional foundation, not evidence of a completed security audit. Before release, validate HTTPS/CORS/cookies on the real origins, configure strong separate JWT secrets, review the process-local abuse protections and security headers, evaluate refresh-family reuse handling and deployment-specific CSRF protection, verify MongoDB indexes/backups, and run role-isolation integration tests. A unique-email pre-check is not atomic; duplicate-key errors are mapped to 409. Refresh rotation now atomically compares the old hash and replaces it, so only one request can consume an old token. The client coordinates refresh within one tab; separate tabs still require additional coordination.

Backend build, mocked tests, real database tests, browser QA, remote push, and deployment are distinct evidence levels. Do not report one as another. See the frontend README for client behavior and UI validation steps.

## 12. Website panels, owner setup, and team onboarding

The website provides Customer, Support, and Admin panels. Authorization is enforced by the API independently of which sign-in portal was selected. No account may request an elevated role through public registration.

### Creating the first administrator without database edits

Set a private random `ADMIN_SETUP_KEY` of at least 32 characters in backend/.env and restart the API. Open `http://localhost:5173/#/setup`, enter the key, name, email, and password. For an existing account, its current password must match before the role can be activated. The server compares the key using timing-safe comparison. A unique SetupLock ID prevents concurrent setup requests from both proceeding. An existing Admin disables setup, and a successful setup retains the lock. Remove the key after setup.

The API does not ship default admin credentials and does not make the first public registrant an administrator. If the process crashes while holding the setup lock before account creation, a trusted operator must inspect/recover that incomplete setup; do not delete a completed lock or expose the setup key publicly. This exceptional recovery is separate from normal UI-based role management.

### Team invitations

An authenticated Admin creates an invitation with name, email, and role. The server generates a random 32-byte token, stores its SHA-256 hash, and returns the raw token only in that creation response. The frontend builds a private link containing the token in its fragment. Tokens are not returned by invitation listings.

Invitations expire after seven days, can be revoked, and are invalidated when the same email is re-invited. Recipients preview their invitation and choose their own password. The server takes the role and identity from the stored invitation, not from the acceptance payload. Atomic find-and-delete consumes the link before account creation; it cannot be accepted twice. If account creation subsequently fails, an admin must issue a fresh invitation. Existing accounts are managed through People instead of re-invited.

No email provider is configured: admins copy links and share them through a trusted channel. Additional admins can be invited. Existing Admin accounts cannot be disabled or demoted through the general access editor, and actors cannot change their own access.

### New API contracts

| Method + path | Access | Input / output |
| --- | --- | --- |
| GET /api/portal/setup | Public | data.hasAdmin and data.setupEnabled |
| POST /api/portal/setup | Owner setup key | name, email, password, setupKey; creates initial Admin |
| POST /api/portal/invitations/preview | Valid invitation token | { token }; safe name/email/role/expiry |
| POST /api/portal/invitations/accept | Valid invitation token | { token, password }; safe created account |
| GET /api/workspace/dashboard | All authenticated roles | Role-scoped status counts, total, recent tickets; admin agent/unassigned counts |
| GET /api/workspace/agents | Admin | Active support-agent directory; safe fields only |
| GET /api/workspace/people | Admin | page, limit, search, role; data array and pagination |
| PATCH /api/workspace/people/:id | Admin | { role?: Customer or SupportAgent, isActive?: boolean }; protected admins/self excluded |
| GET /api/workspace/invitations | Admin | Pending unexpired invitations without token hashes |
| POST /api/workspace/invitations | Admin | { name, email, role }; data.invitation and one-time data.token |
| DELETE /api/workspace/invitations/:id | Admin | Revoke invitation |

People listing uses escaped name/email search and stable pagination. Access updates revoke the affected user's refresh sessions. Authentication reads current role and activation from MongoDB for every request, so an old JWT cannot retain a removed privilege. Review and reassign an agent's open tickets before disabling the account or changing its role; assignments are not automatically redistributed.

Ticket list queries additionally support `assignment=unassigned` for Admin. Other roles cannot use that option to bypass their record filter. List sorting now uses _id as a stable tiebreaker.

### Security controls added with panels

- Login/registration share an IP-based limit of 20 attempts per 15 minutes; owner/invitation public endpoints share 30 per 15 minutes. Excess requests return 429 and Retry-After. Limits are process-local; production replicas need a shared limiter/edge policy and verified proxy configuration.
- Browser state-changing requests with an Origin header must match FRONTEND_URL. Originless API-client requests remain allowed and are still subject to endpoint authentication. This origin guard complements CORS and the cookie flags; it is not a general security certification.
- X-Powered-By is disabled; the API sends nosniff and no-referrer headers. Frontend setup/invitation pages exclude telemetry.
- Unique-key races return 409. Admin setup is off unless a sufficiently long private key is configured. Plaintext passwords, invitation tokens, and setup keys must not be logged.
- Refresh hash replacement now uses an atomic conditional update. A reused old token returns 401. There is no refresh-family-wide compromise/reuse revocation system yet.

### Added source files and verification

`models/Invitation.ts` stores pending invites; `models/SetupLock.ts` serializes initial setup. `validators/portal.validator.ts`, `services/portal.service.ts`, and `routes/portal.routes.ts` own the portal contracts. `middleware/rateLimit.middleware.ts` implements process-local abuse limiting.

Run `npm.cmd test` to build and run `tests/portal.test.mjs`. Tests isolate MongoDB with model mocks and cover role restrictions, public-registration privilege rejection, CORS/origin checks, setup key/concurrency checks, invitation consumption, user access protection/revocation, ticket ownership filters, scoped metrics, and atomic refresh consumption. They never connect to the configured database. Real MongoDB behavior, browser cookies, mobile layouts, deployment, backups, and a security review remain separate checks.

**Interview follow-up:** ?I extended the product from a role-aware queue into separate customer, support, and admin panels. I designed secure first-admin bootstrap and invitation onboarding so public users cannot self-promote, added admin access management and a real agent directory, and kept role and document authorization on the server.?
