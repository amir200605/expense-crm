# ExpenseFlow CRM

A Final Expense CRM built with Next.js 15, Prisma, NextAuth, and PostgreSQL.

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Database**: PostgreSQL (Replit built-in) via Prisma ORM
- **Auth**: NextAuth v4 with credentials provider (JWT sessions)
- **UI**: Tailwind CSS, Radix UI, Recharts
- **External integrations**: OpenAI, Nodemailer, Telnyx

## Project Structure

```
src/
  app/           # Next.js App Router pages and API routes
    (app)/       # Authenticated app pages
    (auth)/      # Login/auth pages
    (marketing)/ # Public marketing pages
    api/         # API route handlers
  components/    # Shared React components
  lib/
    auth.ts      # NextAuth configuration
    db.ts        # Prisma client singleton
    services/    # Business logic services
  types/         # TypeScript types
prisma/
  schema.prisma  # Database schema
  migrations/    # SQL migrations
```

## Environment Variables

Required secrets (set in Replit Secrets):
- `DATABASE_URL` — PostgreSQL connection string (auto-set by Replit)
- `NEXTAUTH_SECRET` — Secret for signing JWT sessions
- `NEXTAUTH_URL` — Set to your Replit dev domain (shared env var)

Optional secrets:
- `OPENAI_API_KEY` — For AI assistant features
- `NEXT_PUBLIC_APP_URL` — Public app URL for email links

## Running the App

```bash
npm run dev       # Dev server on port 5000
npm run build     # Production build
npm run start     # Production server on port 5000
```

## Database Commands

```bash
npm run db:migrate   # Run migrations (dev)
npm run db:push      # Push schema changes
npm run db:seed      # Seed database
npm run db:studio    # Open Prisma Studio
```

## Replit Migration Notes

- Dev/start scripts use `-p 5000 -H 0.0.0.0` for Replit compatibility
- `DIRECT_URL` removed from Prisma schema (not needed on Replit)
- `NEXTAUTH_URL` set to Replit dev domain as shared env var
- Database migrations run with `prisma migrate deploy`
