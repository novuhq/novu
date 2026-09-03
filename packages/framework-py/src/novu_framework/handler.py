"""Novu bridge HTTP handler (agents-only)."""

from __future__ import annotations

import asyncio
import json
import logging
from collections.abc import Callable
from dataclasses import dataclass, field
from typing import Any
from urllib.parse import parse_qs, urlparse

import httpx
from pydantic import ValidationError

from novu_framework._logging import log_task_exception
from novu_framework.agent import RegisteredAgent
from novu_framework.client import Client
from novu_framework.dispatch import AGENT_EVENTS, dispatch_agent_event
from novu_framework.errors import (
    AgentNotFoundError,
    FrameworkError,
    InvalidActionError,
    InvalidRequestError,
)
from novu_framework.hmac import validate_hmac
from novu_framework.types import AgentBridgeRequest, AgentEventName

logger = logging.getLogger(__name__)

RequestBody = bytes | None

SDK_VERSION = "0.1.0"
FRAMEWORK_VERSION = "0.1.0"

_background_tasks: set[asyncio.Task[Any]] = set()

POST_ACTION_AGENT_EVENT = "agent-event"
GET_ACTION_HEALTH_CHECK = "health-check"

_AGENT_EVENT_SET: frozenset[str] = frozenset(AGENT_EVENTS)


def _validate_agent_event(raw: str) -> AgentEventName:
    """Validate and narrow a raw string to a typed AgentEventName.

    Raises InvalidActionError if the string is not a recognized event.
    """
    if raw not in _AGENT_EVENT_SET:
        raise InvalidActionError(raw, AGENT_EVENTS)

    return raw  # type: ignore[return-value]


@dataclass(frozen=True, slots=True)
class HandlerResponse:
    status: int
    headers: dict[str, str]
    body: str


@dataclass
class ServeOptions:
    client: Client | None = None
    agents: list[RegisteredAgent] = field(default_factory=list)
    wait_until: Callable[[asyncio.Task[Any]], None] | None = None
    http_client: httpx.AsyncClient | None = None


class NovuRequestHandler:
    def __init__(self, options: ServeOptions) -> None:
        self.client = options.client or Client()
        self.wait_until = options.wait_until
        self._http_client = options.http_client or httpx.AsyncClient()
        self.client.add_agents(options.agents)

    async def handle(
        self,
        *,
        method: str,
        url: str,
        headers: dict[str, str],
        body: RequestBody = None,
    ) -> HandlerResponse:
        method = method.upper()
        parsed = urlparse(url)
        query = parse_qs(parsed.query)
        action = (query.get("action") or [GET_ACTION_HEALTH_CHECK])[0]
        agent_id = (query.get("agentId") or [""])[0]
        agent_event = (query.get("event") or [""])[0]

        normalized_headers = {key.lower(): value for key, value in headers.items()}
        signature = normalized_headers.get("novu-signature")

        payload: dict[str, Any] = {}
        try:
            if method == "POST" and body is not None:
                payload = self._decode_body(body)

            if action != GET_ACTION_HEALTH_CHECK:
                if self.client.strict_authentication:
                    validate_hmac(payload, signature, self.client.secret_key)

            if method == "GET":
                if action == GET_ACTION_HEALTH_CHECK:
                    return self._ok({"status": "ok"})

                raise InvalidActionError(action, [GET_ACTION_HEALTH_CHECK])

            if method == "OPTIONS":
                return self._ok({})

            if method == "POST":
                if action == POST_ACTION_AGENT_EVENT:
                    return await self._handle_agent_event(agent_id, agent_event, payload)

                raise InvalidActionError(action, [POST_ACTION_AGENT_EVENT])

            return self._error(405, "Method not allowed")
        except FrameworkError as error:
            return self._framework_error(error)

    async def _handle_agent_event(
        self,
        agent_id: str,
        agent_event: str,
        payload: dict[str, Any],
    ) -> HandlerResponse:
        registered = self.client.get_agent(agent_id)
        if registered is None:
            raise AgentNotFoundError(agent_id)

        try:
            bridge = AgentBridgeRequest.model_validate(payload)
        except ValidationError as error:
            raise InvalidRequestError(f"Invalid bridge payload: {error}") from error

        secret_key = self.client.secret_key or ""

        validated_event = _validate_agent_event(agent_event)

        task = asyncio.create_task(
            dispatch_agent_event(
                agent=registered,
                event=validated_event,
                bridge=bridge,
                secret_key=secret_key,
                http_client=self._http_client,
            )
        )

        _background_tasks.add(task)
        task.add_done_callback(_background_tasks.discard)

        if self.wait_until:
            self.wait_until(task)
        else:
            task.add_done_callback(log_task_exception)

        return self._ok({"status": "ack"})

    def _static_headers(self) -> dict[str, str]:
        return {
            "content-type": "application/json",
            "access-control-allow-origin": "*",
            "access-control-allow-private-network": "true",
            "access-control-allow-methods": "GET, POST, OPTIONS",
            "access-control-allow-headers": "*",
            "access-control-max-age": "604800",
            "novu-framework-version": FRAMEWORK_VERSION,
            "novu-framework-sdk": SDK_VERSION,
            "novu-framework-server": "python",
            "user-agent": f"novu-framework:v{SDK_VERSION}",
        }

    def _ok(self, body: dict[str, Any]) -> HandlerResponse:
        return HandlerResponse(
            status=200, headers=self._static_headers(), body=json.dumps(body)
        )

    def _error(self, status: int, message: str) -> HandlerResponse:
        return HandlerResponse(
            status=status,
            headers=self._static_headers(),
            body=json.dumps({"message": message}),
        )

    def _framework_error(self, error: FrameworkError) -> HandlerResponse:
        return HandlerResponse(
            status=error.status_code,
            headers=self._static_headers(),
            body=json.dumps(
                {"message": error.message, "data": error.data, "code": error.code}
            ),
        )

    def _decode_body(self, body: bytes) -> dict[str, Any]:
        try:
            raw = body.decode("utf-8")
        except UnicodeDecodeError as error:
            raise InvalidRequestError("Request body must be valid UTF-8 JSON") from error

        try:
            decoded = json.loads(raw or "{}")
        except json.JSONDecodeError as error:
            raise InvalidRequestError("Request body must be valid JSON") from error

        if not isinstance(decoded, dict):
            raise InvalidRequestError("Request body must be a JSON object")

        return decoded
