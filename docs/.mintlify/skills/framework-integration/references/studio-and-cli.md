# Local Studio & Novu CLI

The **Local Studio** is a companion app to `@novu/framework`. It runs locally, talks to your Bridge Endpoint, and gives you a live preview of every workflow you've registered — including step controls, payload, and rendered output.

## Prerequisites

- Your bridge app running (e.g. `npm run dev` for Next.js, exposing `/api/novu`)
- `NOVU_SECRET_KEY` exported (from `.env`)
- **Chrome only** — the Studio currently doesn't support other browsers

## Launch

```bash
npx novu@latest dev
```

Defaults:
- Bridge port: `4000`
- Bridge route: `/api/novu`
- Studio UI: `http://localhost:2022`

The CLI:
1. Pings your bridge at `http://localhost:4000/api/novu` to discover workflows.
2. Spins up a public tunnel (`https://<id>.novu.sh/api/novu`) so Novu Cloud can reach your machine.
3. Launches the Studio UI in Chrome.

## CLI Flags

| Flag | Long form | Default | Purpose |
| --- | --- | --- | --- |
| `-p` | `--port <port>` | `4000` | Your app's port |
| `-r` | `--route <path>` | `/api/novu` | Bridge route path |
| `-o` | `--origin <url>` | `http://localhost` | Bridge origin |
| `-d` | `--dashboard-url <url>` | `https://dashboard.novu.co` | Dashboard URL — use `https://eu.dashboard.novu.co` for EU |
| `-sp` | `--studio-port <port>` | `2022` | Studio UI port |
| `-t` | `--tunnel <url>` | auto | Self-hosted tunnel (e.g. ngrok) |
| `-H` | `--headless` | `false` | Skip the Studio UI (just keep the tunnel alive) |

### Examples

#### Bridge running on a non-default port

```bash
npx novu@latest dev --port 3002
```

#### EU region

```bash
npx novu@latest dev --port 3002 --dashboard-url https://eu.dashboard.novu.co
```

#### Custom bridge path

```bash
npx novu@latest dev --route /internal/notify
```

#### Self-hosted tunnel (ngrok / Cloudflare Tunnel)

```bash
npx novu@latest dev --tunnel https://my-tunnel.ngrok.app
```

> When using a self-hosted tunnel, **the Studio cannot trigger test events** because it relies on the auto-generated tunnel for callback. Use the Cloud Dashboard to trigger instead.

#### Headless mode

Useful in CI or for keeping the tunnel alive without the UI:

```bash
npx novu@latest dev --headless
```

## What you can do in the Studio

- **Browse workflows** registered by your bridge — code-defined and Dashboard-defined alike
- **Edit Step Controls** in real time and preview the resolved output
- **Edit the Payload** to test edge cases without rebuilding your trigger code
- **Trigger test events** to a subscriber of your choice
- **Sync state** to your Cloud environment from a single button (use CI/CD for production)
- **See errors** from your workflow handler with full stack traces

## Tunnel URL vs Bridge URL

| | Created by | URL pattern | Use for |
| --- | --- | --- | --- |
| **Tunnel URL** | `npx novu@latest dev` | `https://<id>.novu.sh/api/novu` | Local dev — Studio + Cloud testing |
| **Bridge URL** | Your deployed app | `https://api.acme.com/api/novu` | Production sync |

Tunnel IDs are persisted to your machine, so the same URL is reused across `dev` runs.

## `npx novu sync`

Push workflows defined in code to Novu Cloud.

```bash
npx novu@latest sync \
  --bridge-url <YOUR_PUBLIC_BRIDGE_URL> \
  --secret-key <NOVU_SECRET_KEY> \
  --api-url https://api.novu.co
```

| Flag | Purpose |
| --- | --- |
| `--bridge-url` | Public URL to your deployed bridge (`https://app.com/api/novu`) |
| `--secret-key` | `NOVU_SECRET_KEY` for the target environment |
| `--api-url` | `https://api.novu.co` (default) or `https://eu.api.novu.co` for EU |

> Each environment (Development, Production) has its own secret key. Sync once per environment with the matching key.

### Sync from a Vercel Preview URL

Vercel free-tier previews are protected. Enable [Protection Bypass for Automation](https://vercel.com/docs/security/deployment-protection/methods-to-bypass-deployment-protection) and append the bypass token:

```bash
npx novu@latest sync \
  --bridge-url "https://my-app-preview.vercel.app/api/novu?x-vercel-protection-bypass=$BYPASS_TOKEN" \
  --secret-key $NOVU_SECRET_KEY
```

## `npx novu init`

Bootstrap a complete bridge app with a sample workflow. Designed for first-run users.

```bash
npx novu init --secret-key=<YOUR_NOVU_SECRET_KEY>
```

Created files:
- A working `/api/novu` route (Next.js)
- `.env` with `NOVU_SECRET_KEY`
- A sample `welcome-email` workflow demonstrating Step Controls + React Email

## FAQ

### Can I run the Studio without a tunnel?

Yes — pass `-t/--tunnel` with your own URL. The preview will work, but you can't trigger test events from the Studio UI.

```bash
npx novu@latest dev -t https://my-tunnel.example.com
```

### Why does the Studio say it can't reach my bridge?

Common causes:
- App isn't running on the port the Studio is checking — add `--port <yourport>`
- Bridge route is mounted at a different path — add `--route /custom/path`
- Bridge requires auth middleware that blocks Novu — disable JWT for the bridge route

### Why do I see HMAC errors in the Studio?

`NODE_ENV` isn't `development`. Either:
- Set `NODE_ENV=development` for the local bridge process, or
- Pass `strictAuthentication: false` to a custom `Client` in your `serve` setup

### Can I run multiple bridges simultaneously?

Yes — start each bridge on its own port and run a Studio per bridge with `--studio-port`. Each gets its own tunnel.

### Studio works but Cloud can't reach my bridge in production

- Verify the bridge URL is publicly accessible over HTTPS
- Check firewall / WAF rules — Novu workers come from autoscaled IPs, no allowlist
- Make sure `NOVU_SECRET_KEY` is set in your production env vars
- Ensure no auth middleware is blocking `/api/novu`
