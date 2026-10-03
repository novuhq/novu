"""Batched AgentEventEnvelope delivery to Novu ingest API."""

from __future__ import annotations

import asyncio
import logging
import uuid
from datetime import UTC, datetime
from typing import Any, TypedDict

import httpx

from novu_framework.errors import AgentDeliveryError
from novu_framework.types import AGENT_EVENT_PROTOCOL_VERSION

logger = logging.getLogger(__name__)

AgentEvent = dict[str, Any]


class AgentEventEnvelope(TypedDict):
    version: int
    conversationId: str
    agentId: str
    runId: str
    turnId: str
    sequence: int
    timestamp: str
    event: AgentEvent


def _is_retryable_status(status: int) -> bool:
    return status >= 500 or status in (408, 429)


class AgentEventOutbox:
    def __init__(
        self,
        *,
        events_url: str,
        secret_key: str,
        conversation_id: str,
        agent_id: str,
        turn_id: str,
        max_retries: int = 3,
        client: httpx.AsyncClient,
    ) -> None:
        self.run_id = f"run_{uuid.uuid4()}"
        self._sequence = 0
        self._buffer: list[AgentEventEnvelope] = []
        self._events_url = events_url
        self._secret_key = secret_key
        self._conversation_id = conversation_id
        self._agent_id = agent_id
        self._turn_id = turn_id
        self._max_retries = max_retries
        self._client = client

    def enqueue(self, event: AgentEvent) -> None:
        self._sequence += 1
        self._buffer.append(
            {
                "version": AGENT_EVENT_PROTOCOL_VERSION,
                "conversationId": self._conversation_id,
                "agentId": self._agent_id,
                "runId": self.run_id,
                "turnId": self._turn_id,
                "sequence": self._sequence,
                "timestamp": datetime.now(UTC).isoformat(),
                "event": event,
            }
        )

    async def flush(self) -> None:
        if not self._buffer:
            return

        batch = self._buffer
        self._buffer = []
        await self._post_batch_with_retry(batch)

    async def emit(self, event: AgentEvent) -> None:
        self.enqueue(event)
        await self.flush()

    async def _post_batch_with_retry(self, batch: list[AgentEventEnvelope]) -> None:
        last_error: Exception | None = None

        for attempt in range(1, self._max_retries + 1):
            try:
                await self._post_batch(batch)

                return
            except AgentDeliveryError as error:
                last_error = error

                if not _is_retryable_status(error.status_code):
                    raise

                if attempt < self._max_retries:
                    delay = 0.25 * attempt
                    logger.warning(
                        "Outbox delivery failed (attempt %d/%d, status=%d), retrying in %.2fs",
                        attempt,
                        self._max_retries,
                        error.status_code,
                        delay,
                    )
                    await asyncio.sleep(delay)

        if last_error:
            logger.error(
                "Outbox delivery exhausted all %d retries: %s",
                self._max_retries,
                last_error,
            )
            raise last_error

    async def _post_batch(self, batch: list[AgentEventEnvelope]) -> None:
        headers = {
            "Content-Type": "application/json",
            "Authorization": f"ApiKey {self._secret_key}",
        }

        response = await self._client.post(self._events_url, headers=headers, json={"events": batch})

        body = response.text

        if not response.is_success:
            raise AgentDeliveryError(response.status_code, body)

    async def aclose(self) -> None:
        return None
