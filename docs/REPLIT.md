# Running on Replit

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
