# ResolveAI — Frontend knowledge transfer

ResolveAI is a role-aware support workspace built with React, TypeScript, and Vite. It connects to the Express API in `../backend`. The interface uses a logo-matched cyan, electric blue, violet, and neutral palette, responsive navigation, focused ticket cards, and native accessible dialogs.

## 1. Understand the product first

Think of the app as a shared help desk. A customer describes an issue. An administrator assigns a support agent. The agent works on the issue and updates its status. Each person sees the tickets appropriate to their role.

The current product implements authentication and ticket management. Despite the product name, AI classification, generated replies, RAG, live WebSocket updates, attachments, comments, and notifications are **not implemented**. Do not present them as completed features in an interview.

## 2. Run locally

Requirements: a current Node.js version compatible with the installed Vite version, npm, and a running backend with MongoDB configured.

```powershell
cd frontend
npm.cmd ci
# Create .env.local from .env.example, then run:
npm.cmd run dev
```

Open the Local URL printed by Vite. Run the backend in a separate terminal. Use `localhost` consistently for both applications; mixing it with `127.0.0.1` can change cookie behavior.

```dotenv
VITE_API_URL=http://localhost:5000
```

Set the backend `FRONTEND_URL` to the exact Vite origin, usually `http://localhost:5173`. `VITE_API_URL` is the server origin without `/api` because callers include the full API paths. It is public configuration, not a secret. Vite embeds it at build time; changing production configuration requires rebuilding.

Without an override, development uses localhost:5000. Production retains the existing Render API fallback in `src/api.ts`; configure an explicit production URL for predictable deployment.

```powershell
npm.cmd run build
npm.cmd run preview
npm.cmd run lint
npm.cmd test
```

A build confirms TypeScript and bundling. It does not prove that the deployed backend, cookies, or database work.

## First-time onboarding and dedicated panels

Open the website at `#/`. It links to Customer, Support, and Admin sign-in portals. Each portal sends its expected role to login. After verifying the password, the backend rejects mismatches with 403 before creating a session. The selected portal never grants privileges.

| Panel | Overview route | Dedicated pages |
| --- | --- | --- |
| Customer | `#/customer` | My requests, My account |
| Support | `#/support` | My queue, My account |
| Admin | `#/admin` | All tickets, People & access, My account |

The first administrator is created at `#/setup` with a private, server-configured `ADMIN_SETUP_KEY` (at least 32 characters). If setup is disabled, configure that key on the backend and restart it. Once an admin exists, the public setup flow cannot create another.

Admin opens **People & access**, invites a person, selects Customer/SupportAgent/Admin, and copies the one-time link. Share it through a trusted channel; no automatic email service is configured. The recipient sets a password at the invitation page and signs into the assigned panel. The invitation secret is carried in a URL fragment, sent to the API in POST bodies, excluded from telemetry routes, and shown only when generated. Do not paste these links into public chats or screenshots. Revoking or reissuing invalidates the old link.

Existing Customer and SupportAgent accounts can have their role or activation changed in Manage access. Admin accounts and your own access are protected from edits. Additional administrators join through invitations. On window focus, the app rechecks the current profile; the backend always enforces current access on every protected request.

Dashboards display actual role-scoped status counts and recent tickets. Admin also sees the active-agent count and tickets without an assignee. No metrics are simulated.

## 3. User journeys and permissions

| Person | Tickets they see | Actions shown |
| --- | --- | --- |
| Customer | Their own tickets | Create, search, filter, read details |
| Support agent | Tickets assigned to them | Search, filter, read, update status |
| Administrator | All tickets | Create, read, edit, assign, permanently delete |

Registration always creates a Customer. There is no public role selector. The first administrator uses the protected setup screen. Admins then invite people from People & access, choose the recipient role, manage existing customer/agent roles, and enable or disable accounts. No direct database role edits are needed.

### Registration and sign-in

1. Register with name, email, and password.
2. The registration endpoint creates a Customer account.
3. The frontend signs in through a separate login request and opens the customer panel.
4. Store the returned access token in module memory and show the workspace.
5. The browser stores the server's HttpOnly refresh cookie. JavaScript does not read it.

Name is 2–80 characters. Registration passwords need at least 8 characters and at most 72 UTF-8 bytes. Email is trimmed and normalized by the server. Backend validation messages are displayed; login intentionally does not reveal whether the email exists.

### Session restoration and expiry

On a page reload, the in-memory access token is gone. The app first calls `POST /api/auth/refresh`, then `GET /api/auth/me` to fetch the current profile. A neutral loading screen prevents protected UI from briefly appearing before authentication resolves.

Ticket requests include `Authorization: Bearer <accessToken>` and `credentials: include`. If a ticket request returns 401, `apiRequest` shares a single in-flight refresh across concurrent requests, then retries each request once. A rejected refresh session returns the user to sign-in. Network failures remain visible as recoverable errors instead of being treated as successful requests.

Sign-out calls the backend to revoke the refresh session and clear its cookie. The UI clears its own access token only after successful sign-out. This does not revoke already issued access tokens immediately; see the backend README.

### Ticket workflow

- Customer or admin opens Create Ticket, submits validated fields, and returns to the refreshed list.
- Search is debounced by 350 ms. Changing a search/filter/sort/page size resets the page.
- Filters and pagination run on the server. The UI uses API-provided totals and does not invent dashboard metrics.
- Aborted list/detail requests cannot overwrite the latest results.
- Customers get a read-only details view.
- Support agents can change status only.
- Admins can edit title, description, category, priority, and status.
- Admin assignment uses `PATCH /api/tickets/:id/assign` with `{ assignedTo }`. The dropdown loads real active agents from `GET /api/workspace/agents`; no database IDs need to be copied manually.
- Permanent deletion requires a separate confirmation and refreshes the list. Pagination recovers if deleting the last result makes the current page invalid.

The account screen shows name, email, and role. There is no profile editing endpoint, so the UI does not offer profile changes.

## 4. Source map

| File | Responsibility |
| --- | --- |
| `src/App.tsx` | Session bootstrap, protected role panels, shell, account view |
| `src/navigation.ts` | Hash routes, role paths, navigation subscription |
| `src/components/PublicHome.tsx` | One public website connecting all three portals |
| `src/components/AuthScreen.tsx` | Dedicated role sign-in, registration, owner setup, invitation acceptance |
| `src/components/Dashboard.tsx` | Server-backed counts and recently updated tickets |
| `src/components/PeoplePanel.tsx` | Admin user search, invitations, role/activation management |
| `src/components/Brand.tsx` | Existing ResolveAI logo asset |
| `src/components/Telemetry.tsx` | Existing telemetry, excluded from setup and invitation routes |
| `src/api.ts` | API origin, bearer header, cookies, structured errors, single-flight refresh and retry |
| `src/components/TicketList.tsx` | Search/filter/sort/pagination and role-aware creation |
| `src/components/CreateTicket.tsx` | Ticket form, validation, API submission |
| `src/components/TicketDetails.tsx` | Read/edit/status/assignment/delete flows |
| `src/components/Modal.tsx` | Native dialog, focus containment, Escape behavior, scroll locking |
| `src/types/ticket.ts` | Ticket payload types and enum options |
| `src/index.css` | Shared controls and dialog primitives |
| `src/App.css` | Retained ticket component styles |
| `src/workspace.css` | Current visual system, authentication and responsive workspace |

State is local React state. There is no Redux, router package, or query-cache library. Each panel has hash routes for overview, tickets, and account; Admin also has People & access. Dashboard links deep-link into filtered queues or a ticket detail. Hash routing supports reloads without special server path rewrites. A dedicated server-state cache remains a future improvement.

## 5. API contract used by the frontend

| Method and path | Payload / result |
| --- | --- |
| POST `/api/auth/register` | `{ name, email, password }`; account created |
| POST `/api/auth/login` | `{ email, password }`; `data.user`, `data.accessToken`, cookie |
| POST `/api/auth/refresh` | Cookie, no JSON body; `data.accessToken` and rotated cookie |
| GET `/api/auth/me` | Bearer token; `data` is current user |
| POST `/api/auth/logout` | Cookie; revokes refresh session |
| GET `/api/tickets` | Query parameters; `data` array and top-level `pagination` |
| POST `/api/tickets` | `{ title, description, category, priority }` |
| GET `/api/tickets/:id` | `data` is one accessible ticket |
| PATCH `/api/tickets/:id` | Admin-editable fields, or `{ status }` for agents |
| PATCH `/api/tickets/:id/assign` | `{ assignedTo: agentId }` |
| DELETE `/api/tickets/:id` | Admin only |

Ticket enums, limits, complete query options, and error semantics are documented in the backend README. Errors use `{ success: false, message, errors?: [{ field, message }] }`. Do not rename server keys in request payloads.

## 6. Accessibility and responsive behavior

Inputs have visible labels. Forms use native required, length, and pattern checks with backend validation as the authority. Dialogs use `showModal()` for native focus containment, Escape dismissal, and focus restoration. Busy mutations block dismissal and duplicate submissions. Alerts and loading states use live-region roles. A skip link moves keyboard users to the workspace. Navigation and cards adapt to smaller screens, long descriptions wrap, and reduced-motion preferences are respected.

Do a keyboard and screen-reader review before a production accessibility claim; the presence of these patterns is not a certification.

## 7. Troubleshooting

| Symptom | Meaning / next check |
| --- | --- |
| Network or CORS error | Is backend running? Does FRONTEND_URL exactly match the browser origin? |
| Refresh missing cookie | Sign in first; use credentials: include and consistent hostnames |
| GET refresh returns 405 | Refresh is POST, not a browser address-bar GET |
| 401 invalid email/password | Account does not exist in that database or password differs |
| 403 action denied | Role or account state does not allow the action |
| Agent queue is empty | An admin must assign tickets to that agent |
| Ticket 404 | Missing ticket or outside the current user's ownership/assignment scope |
| Production works until reload | Inspect refresh cookie acceptance, HTTPS, CORS and browser third-party cookie policy |

Do not put access tokens in localStorage to hide cookie problems. Production refresh cookies are Secure and SameSite=None; browser third-party cookie restrictions may still prevent cross-site restoration. Prefer an appropriately configured same-site deployment when possible.

## 8. KT walkthrough for a teammate

Start with the permission table. Run both servers and create a Customer. Show login's response and cookie in browser developer tools without exposing credentials. Create a ticket, filter it, and open read-only details. Create the initial admin using setup, invite a support agent through People & access, assign the ticket as admin, update its status as agent, and verify another customer's account cannot read it. Reload to demonstrate refresh, then sign out. Read api.ts next, followed by TicketList, TicketDetails, and the backend routes.

## 9. Interview-ready explanation

**30-second version:** “I built a React and TypeScript support workspace backed by Express and MongoDB. Customers create and track their own requests, agents update assigned tickets, and admins manage the full queue. I implemented cookie-based refresh sessions, bearer authentication, server-side filtering and pagination, and role-aware UI states.”

**Why hide buttons if the API checks roles?** Hiding actions improves usability. API authorization remains the security boundary, because a user can call endpoints without the UI.

**Why two tokens?** The short-lived access token authorizes requests. The longer-lived refresh token restores access without asking for credentials each time. HttpOnly prevents JavaScript from directly reading that cookie; it does not make the whole application immune to XSS or CSRF.

**How do you prevent stale searches?** Debounce the input, reset pagination on a query change, and abort previous requests. Only the latest active request writes its result.

**What would you improve next?** Add automated browser tests, robust cross-tab refresh coordination, shared rate-limit storage, audit logs, monitoring, and evaluate production security controls. AI features would require new backend services and explicit product behavior.

## 10. Release checks

Build both projects, run frontend lint, and validate against a test database using all three roles. Check registration/login/reload/logout; filter combinations and pagination; create/edit/assign/delete; ownership isolation; 400/401/403/404 states; offline recovery; desktop/mobile layouts; keyboard navigation; and actual production cookie behavior. Local build or mocked tests alone do not establish live production readiness.

## Automated tests and current verification limits

`npm.cmd test` runs `tests/panels.test.mjs`. It server-renders the public website and role sign-in/setup screens, checks that public registration offers no privileged role, and verifies shared refresh/retry behavior, session-expiry events, and connection failures using mocked fetch. It does not open a browser or call your database. Requests have a 20-second timeout, and aborted requests cannot overwrite active views.

Brand colors are centralized in `src/panels.css`; shared controls and earlier component rules remain in `index.css`, `App.css`, and `workspace.css`. The original logo is rendered by Brand. Status colors retain semantic meaning rather than turning every status purple.

Vite now loads environment files from the frontend folder. A legacy root-level VITE_API_URL no longer silently redirects local development to a deployed backend. Configure production VITE_API_URL explicitly when building for release.
