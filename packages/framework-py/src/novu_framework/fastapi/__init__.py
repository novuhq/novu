"""FastAPI adapter for Novu agent bridge."""

from __future__ import annotations

import asyncio
from collections.abc import Callable
from typing import Any

from fastapi import FastAPI, Request, Response

from novu_framework.agent import RegisteredAgent
from novu_framework.client import Client
from novu_framework.handler import NovuRequestHandler, ServeOptions

__all__ = ["serve"]


def serve(
    *,
    agents: list[RegisteredAgent],
    client: Client | None = None,
    path: str = "/api/novu",
    wait_until: Callable[[asyncio.Task[Any]], None] | None = None,
) -> FastAPI:
    """Create a FastAPI app serving the Novu agent bridge at ``path``."""

    handler = NovuRequestHandler(
        ServeOptions(client=client, agents=agents, wait_until=wait_until)
    )
    app = FastAPI(title="Novu Agent Bridge")

    async def bridge_endpoint(request: Request) -> Response:
        body = await request.body()
        result = await handler.handle(
            method=request.method,
            url=str(request.url),
            headers=dict(request.headers),
            body=body if body else None,
        )

        return Response(
            content=result.body,
            status_code=result.status,
            headers=result.headers,
            media_type="application/json",
        )

    app.add_api_route(path, bridge_endpoint, methods=["GET", "POST", "OPTIONS"])

    return app
