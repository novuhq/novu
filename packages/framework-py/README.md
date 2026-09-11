# Novu Framework (Python)

Python port of `@novu/framework` for **agent bridge** applications — define conversational agents in your codebase and serve them on a Novu bridge endpoint.

## Installation

```bash
pip install "novu-framework[fastapi]"
```

## Quickstart

```python
from novu_framework import AgentHandlers, agent
from novu_framework.fastapi import serve

async def on_message(message, ctx):
    await ctx.reply(f"You said: {message.text}")

support_bot = agent("support-bot", AgentHandlers(on_message=on_message))
app = serve(agents=[support_bot])
```

Run locally:

```bash
uvicorn main:app --reload --port 8000
```

Sync with Novu Cloud:

```bash
npx novu@latest sync -b http://localhost:8000/api/novu -s "$NOVU_SECRET_KEY"
```

## Scope (v0.1)

- Agent bridge HTTP protocol (`agent-event`, `health-check`)
- HMAC signature verification (`novu-signature`)
- Handlers: `on_message`, `on_action`, `on_reaction`, `on_resolve`, `on_error`
- Context: `reply`, `metadata`, `ask` / `approve` / `choose` / `tell`, `trigger`, `resolve`
- Event outbox ingest (`eventsUrl`) and legacy `replyUrl` transport
- FastAPI adapter

Deferred: notification `workflow()`, JSX tool-approval cards, LangChain adapter.

## Development

```bash
cd packages/framework-py
uv sync --extra dev
uv run pytest
uv run ruff check .
```

## Related

- TypeScript SDK: `@novu/framework`
- Protocol types: `@novu/agent-event-protocol`
