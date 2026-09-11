"""Turn transport abstraction — legacy POST vs. event outbox delivery."""

from __future__ import annotations

import uuid
from dataclasses import dataclass, field
from typing import Any, Literal, Protocol

import httpx

from novu_framework.errors import AgentDeliveryError
from novu_framework.outbox import AgentEventOutbox
from novu_framework.types import (
    AgentBridgeRequest,
    AgentSignal,
)

AgentRunOutcome = Literal["completed", "paused", "aborted"]

ReplyContent = dict[str, str]
SentMessageInfo = dict[str, str]


@dataclass(frozen=True, slots=True)
class SideEffectsSnapshot:
    """Immutable snapshot of signals and resolve state drained from context."""

    signals: list[AgentSignal] = field(default_factory=list)
    resolve: dict[str, Any] | None = None


class TurnTransport(Protocol):
    """Delivery mechanism for a single agent turn."""

    async def send_reply(
        self, content: ReplyContent, side_effects: SideEffectsSnapshot
    ) -> SentMessageInfo | None: ...

    async def set_typing(self, op: str) -> None: ...

    async def flush_side_effects(self, side_effects: SideEffectsSnapshot) -> None: ...

    def queue_run_start(self) -> None: ...

    async def emit_run_finish(self, outcome: AgentRunOutcome) -> None: ...

    async def report_turn_error(self, message: str | None = None) -> None: ...


def _dump_signal(signal: AgentSignal) -> dict[str, Any]:
    """Serialize a signal using wire aliases where needed."""

    return signal.model_dump(exclude_none=True)


def _signals_to_events(signals: list[AgentSignal]) -> list[dict[str, Any]]:
    """Convert typed signals to event-outbox event dicts."""
    return [{"type": "signal", "signal": _dump_signal(signal)} for signal in signals]


class LegacyPostTransport:
    """Legacy transport: one POST per turn action against the bridge's replyUrl."""

    def __init__(
        self,
        *,
        reply_url: str,
        secret_key: str,
        conversation_id: str,
        integration_identifier: str,
        http_client: httpx.AsyncClient,
    ) -> None:
        self._reply_url = reply_url
        self._secret_key = secret_key
        self._conversation_id = conversation_id
        self._integration_identifier = integration_identifier
        self._http_client = http_client

    async def send_reply(
        self, content: ReplyContent, side_effects: SideEffectsSnapshot
    ) -> SentMessageInfo | None:
        body = self._base_body()
        body["reply"] = content
        self._apply_side_effects(body, side_effects)

        return await self._post(body)

    async def set_typing(self, op: str) -> None:
        body = self._base_body()
        body["typing"] = op
        await self._post(body)

    async def flush_side_effects(self, side_effects: SideEffectsSnapshot) -> None:
        body = self._base_body()
        self._apply_side_effects(body, side_effects)
        await self._post(body)

    def queue_run_start(self) -> None:
        pass

    async def emit_run_finish(self, outcome: AgentRunOutcome) -> None:
        pass

    async def report_turn_error(self, message: str | None = None) -> None:
        body = self._base_body()
        body["error"] = True
        await self._post(body)

    def _base_body(self) -> dict[str, Any]:
        return {
            "conversationId": self._conversation_id,
            "integrationIdentifier": self._integration_identifier,
        }

    def _apply_side_effects(self, body: dict[str, Any], side_effects: SideEffectsSnapshot) -> None:
        if side_effects.signals:
            body["signals"] = [_dump_signal(s) for s in side_effects.signals]
        if side_effects.resolve is not None:
            body["resolve"] = side_effects.resolve

    async def _post(self, body: dict[str, Any]) -> SentMessageInfo | None:
        headers = {
            "Content-Type": "application/json",
            "Authorization": f"ApiKey {self._secret_key}",
        }

        response = await self._http_client.post(self._reply_url, headers=headers, json=body)

        if not response.is_success:
            raise AgentDeliveryError(response.status_code, response.text)

        raw = response.text
        if not raw:
            return None

        try:
            parsed = response.json()
            envelope = parsed.get("data", parsed) if isinstance(parsed, dict) else parsed
            if isinstance(envelope, dict) and isinstance(envelope.get("messageId"), str):
                return {
                    "messageId": envelope["messageId"],
                    "platformThreadId": str(envelope.get("platformThreadId", "")),
                }
        except Exception:
            return None

        return None
class EventOutboxTransport:
    """SDK-native transport: batches AgentEvents through the run's outbox."""

    def __init__(self, outbox: AgentEventOutbox) -> None:
        self._outbox = outbox

    async def send_reply(
        self, content: ReplyContent, side_effects: SideEffectsSnapshot
    ) -> SentMessageInfo | None:
        message_id = f"msg_{uuid.uuid4()}"
        events = _signals_to_events(side_effects.signals)
        if side_effects.resolve is not None:
            events.append({"type": "resolve", **side_effects.resolve})

        events.append(
            {
                "type": "message",
                "role": "assistant",
                "messageId": message_id,
                "content": content,
            }
        )
        await self._emit_and_flush(events)

        return {"messageId": message_id, "platformThreadId": ""}

    async def set_typing(self, op: str) -> None:
        if op == "stop":
            await self._outbox.emit({"type": "channel.typing", "state": "off"})

            return

        await self._outbox.emit({"type": "channel.typing", "state": "on"})

    async def flush_side_effects(self, side_effects: SideEffectsSnapshot) -> None:
        events = _signals_to_events(side_effects.signals)
        if side_effects.resolve is not None:
            events.append({"type": "resolve", **side_effects.resolve})

        await self._emit_and_flush(events)

    def queue_run_start(self) -> None:
        self._outbox.enqueue({"type": "run-start"})

    async def emit_run_finish(self, outcome: AgentRunOutcome) -> None:
        await self._outbox.emit({"type": "run-finish", "outcome": outcome})

    async def report_turn_error(self, message: str | None = None) -> None:
        await self._outbox.emit({"type": "run-error", "message": message or "agent handler failed"})

    async def _emit_and_flush(self, events: list[dict[str, Any]]) -> None:
        if not events:
            return

        for event in events:
            self._outbox.enqueue(event)

        await self._outbox.flush()

def create_transport(
    request: AgentBridgeRequest,
    secret_key: str,
    *,
    http_client: httpx.AsyncClient,
) -> TurnTransport:
    """Select the appropriate transport based on whether the request has an eventsUrl."""
    if request.eventsUrl:
        return EventOutboxTransport(
            AgentEventOutbox(
                events_url=request.eventsUrl,
                secret_key=secret_key,
                conversation_id=request.conversationId,
                agent_id=request.agentId,
                turn_id=request.deliveryId,
                client=http_client,
            )
        )

    return LegacyPostTransport(
        reply_url=request.replyUrl,
        secret_key=secret_key,
        conversation_id=request.conversationId,
        integration_identifier=request.integrationIdentifier,
        http_client=http_client,
    )
