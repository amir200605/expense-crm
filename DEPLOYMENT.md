# Deploying ExpenseFlow CRM Online

Your app is **Next.js 15** with **Prisma** and **NextAuth**. Here’s how to put it online.

---

## Option 1: Vercel (recommended)

Vercel is the simplest way to host a Next.js app.

### 1. Push code to GitHub

- Create a repo at [github.com](https://github.com/new).
- Push your project:
  ```bash
  git init
  git add .
  git commit -m "Initial commit"
  git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
  git push -u origin main
  ```

### 2. Create a production database

Vercel’s serverless environment doesn’t keep SQLite files. Use a **PostgreSQL** database in the cloud:

- **[Vercel Postgres](https://vercel.com/storage/postgres)** – one-click in Vercel dashboard.
- **[Neon](https://neon.tech)** – free tier, then connect from Vercel.
- **[Supabase](https://supabase.com)** – free tier, provides Postgres.

Get the **connection string** (e.g. `postgresql://user:pass@host/db?sslmode=require`).

**If you use SQLite locally:** switch Prisma to PostgreSQL for production:

1. In `prisma/schema.prisma`, set:
   ```prisma
   datasource db {
     provider = "postgresql"
     url      = env("DATABASE_URL")
   }
   ```
2. Run `npx prisma migrate dev` locally (with a local Postgres or a Neon dev DB) to create migrations, or use `prisma db push` for a quick deploy (less ideal for production).

### 3. Deploy on Vercel

1. Go to [vercel.com](https://vercel.com) and sign in with GitHub.
2. **Add New Project** → import your GitHub repo.
3. **Environment variables** – add these (Vercel → Project → Settings → Environment Variables):

   | Name | Value | Notes |
   |------|--------|--------|
   | `DATABASE_URL` | `postgresql://...` | From Neon/Vercel Postgres/Supabase |
   | `NEXTAUTH_SECRET` | Random string | e.g. `openssl rand -base64 32` |
   | `NEXTAUTH_URL` | `https://your-app.vercel.app` | Your live URL (no trailing slash) |
   | `NEXT_PUBLIC_APP_URL` | `https://your-app.vercel.app` | Same as above for links in emails |

   Add any other vars you use (e.g. Telnyx, Outlook SMTP, `OPENAI_API_KEY`).

4. Deploy. Vercel will run `build` and use `next start` (or their own run).

### 4. Run migrations on the production DB

After the first deploy, run migrations against the **production** `DATABASE_URL`:

- **Vercel:** Project → Settings → one-time use “Run Command” or use Vercel’s CLI.
- Or locally (one-time):
  ```bash
  set DATABASE_URL=postgresql://...your-production-url...
  npx prisma migrate deploy
  ```
  (Use your real connection string; on Mac/Linux use `export` instead of `set`.)

Your app will be live at `https://your-project.vercel.app` (or your custom domain).

---

## Option 2: Railway

Good if you want **app + database** in one place.

1. Go to [railway.app](https://railway.app) and sign in with GitHub.
2. **New Project** → **Deploy from GitHub** (select your repo).
3. Add a **PostgreSQL** service in the same project; Railway gives you `DATABASE_URL`.
4. In your app service, add env vars: `DATABASE_URL`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL` = `https://your-app.up.railway.app`, etc.
5. Set **Root Directory** to your app folder if the repo has more than the app.
6. Build command: `npm run build`. Start command: `npm start`.
7. Run migrations (CLI or one-off job): `npx prisma migrate deploy`.

---

## Option 3: Render

1. [render.com](https://render.com) → **New** → **Web Service**.
2. Connect GitHub and select the repo.
3. **Environment**: Node. Build: `npm install && npx prisma generate && npm run build`. Start: `npm start`.
4. Add a **PostgreSQL** database in Render and use its `DATABASE_URL`.
5. Add `NEXTAUTH_URL`, `NEXTAUTH_SECRET`, and other env vars.
6. Deploy, then run `npx prisma migrate deploy` against the production DB (e.g. via shell in Render dashboard).

---

## Checklist before going live

- [ ] **Database**: PostgreSQL (or other hosted DB) with `DATABASE_URL` set in production.
- [ ] **Prisma**: `provider = "postgresql"` in `schema.prisma` if you move off SQLite.
- [ ] **NEXTAUTH_URL**: Set to your real URL, e.g. `https://your-app.vercel.app`.
- [ ] **NEXTAUTH_SECRET**: Strong random value (e.g. `openssl rand -base64 32`).
- [ ] **Migrations**: Run `prisma migrate deploy` (or `db push` only if you accept the tradeoffs) against the production DB once.
- [ ] **Secrets**: Telnyx, Outlook SMTP, OpenAI, etc. added as env vars in the host’s dashboard (never commit them).

---

## Custom domain (optional)

- **Vercel:** Project → Settings → Domains → add your domain and follow DNS instructions.
- **Railway / Render:** Add domain in the service settings and point DNS (CNAME or A record) as shown.

After DNS propagates, set `NEXTAUTH_URL` and `NEXT_PUBLIC_APP_URL` to `https://yourdomain.com`.
