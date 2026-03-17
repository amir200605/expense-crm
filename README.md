# ExpenseFlow CRM

Final Expense CRM for insurance agencies and agents. Capture leads, track clients and policies, manage pipeline, tasks, appointments, commissions, and chargebacks with role-based dashboards and compliance-friendly audit trails.

## Tech stack

- **Frontend:** Next.js 15 (App Router), React, TypeScript, Tailwind CSS, shadcn/ui, React Hook Form, Zod, TanStack Query, Recharts
- **Backend:** Next.js API routes, Prisma ORM, PostgreSQL
- **Auth:** NextAuth.js (credentials + JWT session)
- **Optional:** Twilio (SMS), Resend (email), Redis (queues)

## Getting started

### Prerequisites

- Node.js 18+
- PostgreSQL database

### Setup

1. **Clone and install**

   ```bash
   cd crm
   npm install
   ```

2. **Environment**

   Copy `.env.example` to `.env` and set:

   - `DATABASE_URL` — PostgreSQL connection string (e.g. `postgresql://user:password@localhost:5432/expenseflow_crm`)
   - `NEXTAUTH_SECRET` — random string (e.g. `openssl rand -base64 32`)
   - `NEXTAUTH_URL` — app URL (e.g. `http://localhost:3000`)

3. **Database**

   ```bash
   npx prisma migrate dev
   npm run db:seed
   ```

4. **Run**

   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000).

### Seed accounts

After seeding you can sign in with:

- **Owner:** `owner@demoagency.com` / `password123`
- **Manager:** `manager1@demoagency.com` / `password123`
- **Agent:** `agent1@demoagency.com` / `password123`

## Scripts

| Script        | Description                |
|---------------|----------------------------|
| `npm run dev` | Start dev server (Turbopack) |
| `npm run build` | Production build          |
| `npm run start` | Start production server   |
| `npm run db:generate` | Generate Prisma client |
| `npm run db:push` | Push schema (no migrations) |
| `npm run db:migrate` | Run migrations        |
| `npm run db:seed` | Seed database          |
| `npm run db:studio` | Open Prisma Studio   |

## Roles

- **Super Admin** — Full platform access, agencies, billing, audit.
- **Agency Owner** — All leads, agents, pipelines, reports, commissions for their agency.
- **Manager** — Assigned agents and team performance, reassign leads.
- **Agent** — Assigned leads/clients/tasks only; call, text, notes, appointments, statuses.
- **QA / Compliance** — Read-only access to calls, notes, policy changes, audit logs.

## Main features

- **Leads** — CRUD, import, webhook intake, duplicate detection, bulk assign, round robin, statuses, tags, convert to client.
- **Clients** — From lead conversion; policy summary, beneficiary, documents placeholder, activity, compliance notes.
- **Pipeline** — Kanban (New Lead → Contacting → … → Placed / Lost); filters, drag-and-drop ready.
- **Tasks & appointments** — By agent/lead/client; calendar view, reminders.
- **Policies** — Track status, carrier, face amount, premium, chargeback window.
- **Commissions & chargebacks** — Expected/received, agent-level, CSV export (API ready).
- **Communications** — SMS/email log and templates (structure in place).
- **Automations** — Trigger/action engine and starter templates (structure in place).
- **Reports** — Lead source, agent activity, appointments, sales, commissions, chargebacks, DNC (API ready).
- **Audit log** — Key actions logged; queryable by entity (Super Admin / QA).
- **Webhook** — `POST /api/webhooks/leads` accepts JSON or form-encoded lead post; field mapping, duplicate detection, optional auto-assign.

## Webhook lead intake

`POST /api/webhooks/leads` accepts:

- **Content-Type:** `application/json` or `application/x-www-form-urlencoded`
- **Required:** `firstName`, `lastName`, `phone`
- **Optional:** `email`, `source`, `campaign`, `state`, `city`, `zip`, `vendor`, `subId`

Raw payload is stored; duplicates are detected by phone/email/name+DOB. Response: `{ success: true, leadId, isDuplicate }`.

## Deployment (Vercel)

1. Connect the repo to Vercel.
2. Add environment variables (`DATABASE_URL`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL`).
3. Use Vercel Postgres or an external PostgreSQL; run migrations in build or as a release step (e.g. `prisma migrate deploy`).
4. Build command: `npm run build` (or `npx prisma generate && next build` if you generate Prisma in build).

## License

Private / commercial as needed.
