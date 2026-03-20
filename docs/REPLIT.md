# Running on Replit

## Database (Replit PostgreSQL)

This app uses **PostgreSQL** with Prisma — the same type of database Replit provides.

1. **Create / attach the database**
   - In Replit, open the **Database** tool (or **+ Create database** → **PostgreSQL**).
   - Follow the prompts to provision a Postgres instance for your Repl.

2. **Connection string (`DATABASE_URL`)**
   - Replit often **injects `DATABASE_URL` automatically** when the database is linked to the Repl.
   - Confirm under **Tools → Secrets** (or **Deployment → Secrets** for published apps) that **`DATABASE_URL`** exists and looks like:
     `postgresql://USER:PASSWORD@HOST:PORT/DATABASE?sslmode=require`
   - If it’s missing, copy the **connection URI** from the Database panel and add it as a secret named **`DATABASE_URL`** (exact name).

3. **Apply the schema (required once per environment)**
   - Open the Shell and run:
     ```bash
     npx prisma migrate deploy
     ```
   - Optional: seed demo data:
     ```bash
     npm run db:seed
     ```
   - Or bootstrap a minimal agency + admin user:
     ```bash
     curl -X POST https://YOUR-REPL-URL/api/auth/ensure-demo-user
     ```

4. **Restart the Repl** after changing secrets so `DATABASE_URL` is picked up.

5. **SSL errors** — If Prisma can’t connect, use the URL Replit shows (often includes `sslmode=require`). Don’t commit secrets; keep them only in Replit Secrets.

---

## Telnyx SMS (`TELNYX_API_KEY`)

1. In Replit, open **Tools → Secrets** (lock icon).
2. Add a secret with the name **`TELNYX_API_KEY`** exactly (all caps, underscores — **not** `telnyx_api_key` or `Telnyx-Key`).
3. Paste your Telnyx API key as the value (no extra spaces).
4. **Stop** the Repl, then **Run** again so the process picks up secrets. (Secrets are injected when the Node process starts.)
5. In the app **Settings → Integrations**, set **From number** and click **Save integrations**.

If Settings still shows **TELNYX_API_KEY: missing** after that, pull the latest app code: we read the key in a way that works when the key exists only at **runtime** (Replit), not only at **build** time.

### Optional: same pattern for SMS “From” number and Outlook

| Secret name | Purpose |
|-------------|---------|
| `TELNYX_FROM_NUMBER` | Your Telnyx sending number (E.164, e.g. `+15551234567`). Overrides the From number saved in the app. |
| `OUTLOOK_FROM_EMAIL` | “From” address for SMTP |
| `OUTLOOK_SMTP_USER` | Usually same as From email |
| `OUTLOOK_SMTP_PASSWORD` | Password or Microsoft app password |

**Settings → Integrations** shows which of these the server sees (without revealing values).

### Published deployments

If you use **Replit Deployments**, add **`TELNYX_API_KEY`** again under the deployment’s **Secrets / Environment** and **redeploy**. Workspace secrets are not always the same as deployment secrets.

### Test SMS number format

Use E.164: **`+1`** plus 10 digits (e.g. `+15614515321`), not only `15614515321`.

## Diagnostics

On **Settings → Integrations**, the readiness section shows whether the server sees `TELNYX_API_KEY`, the From number (app or `TELNYX_FROM_NUMBER`), and which Outlook secrets are set.
