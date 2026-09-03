"""Minimal FastAPI agent bridge example."""

from __future__ import annotations

import os

from novu_framework import AgentHandlers, agent
from novu_framework.context import AgentContextImpl
from novu_framework.fastapi import serve
from novu_framework.types import AgentMessage


async def on_message(message: AgentMessage, ctx: AgentContextImpl) -> str:
    return f"You said: {message.text}"


support_bot = agent(
    "support-bot",
    AgentHandlers(on_message=on_message),
)

app = serve(agents=[support_bot])

if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=int(os.environ.get("PORT", "8000")),
        reload=True,
    )
