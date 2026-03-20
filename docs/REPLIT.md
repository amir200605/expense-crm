# Running on Replit

## Telnyx SMS (`TELNYX_API_KEY`)

1. In Replit, open **Tools → Secrets** (lock icon).
2. Add a secret with the name **`TELNYX_API_KEY`** exactly (all caps, underscores — **not** `telnyx_api_key` or `Telnyx-Key`).
3. Paste your Telnyx API key as the value (no extra spaces).
4. **Stop** the Repl, then **Run** again so the process picks up secrets. (Secrets are injected when the Node process starts.)
5. In the app **Settings → Integrations**, set **From number** and click **Save integrations**.

If Settings still shows **TELNYX_API_KEY: missing** after that, pull the latest app code: we read the key in a way that works when the key exists only at **runtime** (Replit), not only at **build** time.

### Published deployments

If you use **Replit Deployments**, add **`TELNYX_API_KEY`** again under the deployment’s **Secrets / Environment** and **redeploy**. Workspace secrets are not always the same as deployment secrets.

### Test SMS number format

Use E.164: **`+1`** plus 10 digits (e.g. `+15614515321`), not only `15614515321`.

## Diagnostics

On **Settings → Integrations**, the **SMS readiness** box shows whether the server sees `TELNYX_API_KEY` and whether the From number was saved.
