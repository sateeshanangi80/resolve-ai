# ResolveAI

A connected support website with dedicated **Customer**, **Support**, and **Admin** panels. Built with React, TypeScript, Express, and MongoDB. The UI follows the cyan, blue, and violet colors in the ResolveAI logo.

## The complete flow

1. The owner creates the first administrator through the protected setup screen.
2. The admin opens **People & access** and creates invitations for agents, customers, or additional admins.
3. Each recipient opens their private link and chooses a password.
4. Customers register or sign in, create tickets, and track progress.
5. Admins assign tickets by selecting an active agent by name.
6. Support agents open their assigned queue and update ticket status.

Normal onboarding and access management happen in the website. There is no need to edit user roles in MongoDB.

## Start locally

Start the two projects in separate terminals:

```powershell
cd backend
npm.cmd ci
# Create .env using .env.example; configure MongoDB, origins, and private secrets.
npm.cmd run dev
```

```powershell
cd frontend
npm.cmd ci
# Optional: create .env.local using .env.example.
npm.cmd run dev
```

Use `http://localhost:5173` for the frontend and `http://localhost:5000` for the backend. Set backend `FRONTEND_URL=http://localhost:5173`. Set frontend `VITE_API_URL=http://localhost:5000` if overriding the development default. Frontend environment files live in `frontend/`; backend environment files live in `backend/`.

### First administrator

Set a private random `ADMIN_SETUP_KEY` of at least 32 characters in `backend/.env`, then restart the backend. The value is not a frontend environment variable and must not be committed or shared with users.

Open `http://localhost:5173/#/setup`, enter that key, and create your admin account with a new email, or use an existing account with its current password. Setup is disabled when an admin already exists. Remove the setup key from the backend environment after successful setup.

Open **Admin panel → People & access → Invite a person**. Choose a role and share the generated one-time link through your trusted channel. No email is sent automatically. Links expire after seven days and can be revoked. Existing customer accounts can be changed to SupportAgent in **Manage access**.

## Website routes

| Page | URL fragment |
| --- | --- |
| Website | `#/` |
| Customer sign in | `#/login/customer` |
| Support sign in | `#/login/support` |
| Admin sign in | `#/login/admin` |
| Customer registration | `#/register` |
| First admin setup | `#/setup` |
| Customer panel | `#/customer` |
| Support panel | `#/support` |
| Admin panel | `#/admin` |

Each panel has an overview, ticket queue, and account view. Admin additionally has People & access. Each sign-in portal checks the account's actual server role. A mismatched role is rejected with a clear message; selecting a portal never grants that role.

## Technical handover

- [Frontend README](frontend/README.md): UI structure, role journeys, sessions, accessibility, tests, and interview questions.
- [Backend README](backend/README.md): API contracts, validation, models, authorization, onboarding, security boundaries, and KT exercises.

## Validation

Run `npm.cmd test` and `npm.cmd run build` in each project, plus `npm.cmd run lint` in frontend. Automated tests use isolated model/fetch mocks and server-rendered UI. They do not modify your MongoDB data or prove live browser behavior.

Before deployment, complete browser testing on the real origins and integration testing with a disposable database. Configure HTTPS, shared rate limiting when running multiple API instances, logging/monitoring, backups, and required MongoDB indexes. See the backend README for remaining operational limits.

AI classification, RAG, generated replies, and WebSocket updates are future work; they are not implemented in the current product.
