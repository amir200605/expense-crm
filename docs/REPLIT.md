# Running on Replit

## Telnyx SMS (`TELNYX_API_KEY`)

1. In Replit, open **Tools → Secrets** (lock icon).
2. Add a secret with the name **`TELNYX_API_KEY`** exactly (case-sensitive).
3. Paste your Telnyx API key as the value.
4. **Stop** the Repl, then **Run** again so the process picks up secrets.
5. In the app **Settings → Integrations**, set **From number** and click **Save integrations**.

### Published deployments

If you use **Replit Deployments**, add **`TELNYX_API_KEY`** again under the deployment’s **Secrets / Environment** and **redeploy**. Workspace secrets are not always the same as deployment secrets.

### Test SMS number format

Use E.164: **`+1`** plus 10 digits (e.g. `+15614515321`), not only `15614515321`.

## Diagnostics

On **Settings → Integrations**, the **SMS readiness** box shows whether the server sees `TELNYX_API_KEY` and whether the From number was saved.
