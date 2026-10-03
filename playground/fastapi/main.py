"""FastAPI playground — Novu Python agent bridge.

Run:
    uv run uvicorn main:app --reload --port 8000
"""

from __future__ import annotations

import os

from dotenv import load_dotenv

load_dotenv()

from agents import human_hitl_agent, support_bot_agent
from novu_framework.fastapi import serve

app = serve(agents=[support_bot_agent, human_hitl_agent])

if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=int(os.environ.get("PORT", "8000")),
        reload=True,
    )
