# Novu FastAPI Playground

Python agent bridge playground — the Python equivalent of the NestJS / Next.js playgrounds.

Registers two agents on the Novu bridge endpoint (`/api/novu`):

| Agent ID | Description |
|----------|-------------|
| `support-bot` | Echo agent — replies with the incoming message text. |
| `human-hitl` | HITL demo — `ctx.approve`, `ctx.ask`, `ctx.choose`, `ctx.tell` (same phrases as the Next.js playground). |

## Prerequisites

- Python 3.11+
- [uv](https://docs.astral.sh/uv/)
- A running Novu environment (local stack or Novu Cloud)

## Run it locally

**1. Set up env**

```bash
cd playground/fastapi
cp .env.example .env
```

Edit `.env` and paste your `NOVU_SECRET_KEY` (Dashboard > Settings > API Keys).

**2. Install deps**

```bash
uv sync
```

**3. Start the bridge**

```bash
uv run uvicorn main:app --reload --port 8000
```

Verify: `curl http://localhost:8000/api/novu?action=health-check` should return `{"status":"ok"}`.

**4. Create a tunnel and auto-register agents**

```bash
npx novu@latest dev --port 8000 --route /api/novu --dashboard-url http://localhost:4201
```

The CLI will:
- Create a tunnel to your local port 8000
- Call `GET /api/novu?action=discover` to find `support-bot` and `human-hitl`
- Auto-set `devBridgeUrl` on each agent and enable LOCAL mode

**5. Test it**

Send a message in the agent conversation from the dashboard.
- `support-bot` echoes your message back.
- `human-hitl` responds to keywords: `approve`, `ask`, `choose`, `tell`.

## Without `novu dev`

If you prefer a different tunnel (ngrok, Cloudflare Tunnel, etc.):

```bash
ngrok http 8000
```

Then sync manually:

```bash
npx novu@latest sync -b https://<your-tunnel>/api/novu -s "$NOVU_SECRET_KEY"
```

Or paste the tunnel URL into the agent sidebar in the dashboard and flip the toggle to **LOCAL**.

## Environment variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `NOVU_SECRET_KEY` | Yes (for HMAC) | — | Must match the dashboard environment secret. |
| `NOVU_API_URL` | No | `https://api.novu.co` | Override for self-hosted Novu. |
| `NOVU_STRICT_AUTHENTICATION` | No | `true` | Set to `false` to skip HMAC on unsigned probes (local dev). |
| `PORT` | No | `8000` | Uvicorn listen port when using `python main.py`. |
| `HITL_SENT_TO` | No | — | Comma-separated subscriber IDs for the `multi-approve` demo. |

## Testing

The playground itself has no tests — it is a runnable example. To run the framework package tests:

```bash
cd ../../packages/framework-py
uv sync --extra dev
uv run pytest
```
