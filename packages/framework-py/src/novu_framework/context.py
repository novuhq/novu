"""Agent turn context — reply, metadata, human-in-the-loop, side effects."""

from __future__ import annotations

import uuid
from typing import Any

from novu_framework.transport import (
    AgentRunOutcome,
    SideEffectsSnapshot,
    TurnTransport,
)
from novu_framework.types import (
    AgentAction,
    AgentBridgeRequest,
    AgentConversation,
    AgentHumanResponse,
    AgentMessage,
    AgentReaction,
    AgentSignal,
    AgentSignalHuman,
    AgentSignalMetadataClear,
    AgentSignalMetadataDelete,
    AgentSignalMetadataSet,
    AgentSignalTrigger,
    AgentSubscriber,
    HumanInteractionKind,
)


def _mint(prefix: str) -> str:
    return f"{prefix}_{uuid.uuid4()}"


class MetadataAccessor:
    """Typed accessor for conversation metadata with signal tracking."""

    __slots__ = ("_context",)

    def __init__(self, context: AgentContextImpl) -> None:
        self._context = context

    def get(self, key: str) -> object:
        return self._context._metadata_state.get(key)

    def set(self, key: str, value: object) -> None:
        self._context._metadata_state[key] = value
        self._context._signals.append(
            AgentSignalMetadataSet(key=key, value=value)
        )

    def delete(self, key: str) -> None:
        self._context._metadata_state.pop(key, None)
        self._context._signals.append(
            AgentSignalMetadataDelete(key=key)
        )

    def clear(self) -> None:
        self._context._metadata_state.clear()
        self._context._signals.append(AgentSignalMetadataClear())

    @property
    def current(self) -> dict[str, object]:
        return dict(self._context._metadata_state)


class AgentContextImpl:
    """Runtime context for a single agent turn."""

    def __init__(
        self,
        request: AgentBridgeRequest,
        transport: TurnTransport,
    ) -> None:
        self._request = request
        self._signals: list[AgentSignal] = []
        self._resolve_signal: dict[str, Any] | None = None
        self._metadata_state: dict[str, object] = dict(request.conversation.metadata or {})
        self.metadata = MetadataAccessor(self)

        self.message: AgentMessage | None = request.message
        self.action: AgentAction | None = request.action
        self.reaction: AgentReaction | None = request.reaction
        self.conversation: AgentConversation = request.conversation
        self.subscriber: AgentSubscriber = request.subscriber
        self.history = request.history
        self.platform: str = request.platform
        self.platform_context: dict[str, Any] = request.platformContext
        self.human_response: AgentHumanResponse | None = request.humanResponse

        self._transport = transport

    def queue_run_start(self) -> None:
        self._transport.queue_run_start()

    async def reply(self, content: str) -> dict[str, str]:
        side_effects = self._drain_side_effects_snapshot()
        reply_content = {"markdown": content}

        info = await self._transport.send_reply(reply_content, side_effects)

        return info or {"messageId": "", "platformThreadId": ""}

    def ask(
        self,
        question: str,
        *,
        from_: str | None = None,
        ttl_seconds: int | None = None,
        to: str | list[str] | None = None,
    ) -> str:
        return self._queue_human_signal(
            "ask", question, from_=from_, ttl_seconds=ttl_seconds, to=to
        )

    def approve(
        self,
        action: str,
        *,
        from_: str | None = None,
        ttl_seconds: int | None = None,
        to: str | list[str] | None = None,
    ) -> str:
        return self._queue_human_signal(
            "approve", action, from_=from_, ttl_seconds=ttl_seconds, to=to
        )

    def choose(
        self,
        question: str,
        options: list[str],
        *,
        from_: str | None = None,
        ttl_seconds: int | None = None,
        to: str | list[str] | None = None,
    ) -> str:
        if len(options) < 2 or len(options) > 10:
            raise ValueError("ctx.choose requires between 2 and 10 options")

        if any(not isinstance(option, str) or not option.strip() for option in options):
            raise ValueError("ctx.choose options must be non-empty strings")

        return self._queue_human_signal(
            "choose", question, from_=from_, ttl_seconds=ttl_seconds, to=to, options=options
        )

    def tell(
        self,
        message: str,
        *,
        from_: str | None = None,
        to: str | list[str] | None = None,
    ) -> str:
        return self._queue_human_signal("tell", message, from_=from_, to=to)

    def trigger(
        self,
        workflow_id: str,
        *,
        to: str | dict[str, str] | None = None,
        payload: dict[str, Any] | None = None,
    ) -> None:
        self._signals.append(
            AgentSignalTrigger(workflowId=workflow_id, to=to, payload=payload)
        )

    def resolve(self, summary: str | None = None) -> None:
        self._resolve_signal = {"summary": summary} if summary else {}

    async def emit_run_finish(self, *, outcome: AgentRunOutcome = "completed") -> None:
        await self._transport.emit_run_finish(outcome)

    async def report_turn_error(self, message: str | None = None) -> None:
        await self._transport.report_turn_error(message)

    async def flush(self) -> None:
        if not self._has_pending_side_effects():
            return

        side_effects = self._drain_side_effects_snapshot()
        await self._transport.flush_side_effects(side_effects)

    async def typing_stop(self) -> None:
        await self._transport.set_typing("stop")

    def _queue_human_signal(
        self,
        kind: HumanInteractionKind,
        prompt: str,
        *,
        from_: str | None = None,
        ttl_seconds: int | None = None,
        to: str | list[str] | None = None,
        options: list[str] | None = None,
    ) -> str:
        request_id = _mint("hr")
        normalized_to = _normalize_human_to(to) if to is not None else None

        self._signals.append(
            AgentSignalHuman(
                kind=kind,
                prompt=prompt,
                requestId=request_id,
                options=options,
                **{"from": from_} if from_ else {},
                ttlSeconds=ttl_seconds,
                to=normalized_to,
            )
        )

        return request_id

    def _has_pending_side_effects(self) -> bool:
        return bool(self._signals or self._resolve_signal)

    def _drain_side_effects_snapshot(self) -> SideEffectsSnapshot:
        snapshot = SideEffectsSnapshot(
            signals=list(self._signals), resolve=self._resolve_signal
        )
        self._signals = []
        self._resolve_signal = None

        return snapshot


def _normalize_human_to(value: str | list[str]) -> str | list[str]:
    """Normalize the `to` parameter for human signals.

    Accepts a single subscriber ID string or a list of subscriber IDs.
    Strips whitespace and filters out empty entries from lists.
    """
    if isinstance(value, list):
        cleaned = [v.strip() for v in value if isinstance(v, str) and v.strip()]
        if not cleaned:
            raise ValueError("human signal 'to' list must contain at least one non-empty subscriber ID")

        return cleaned

    if not value.strip():
        raise ValueError("human signal 'to' must be a non-empty subscriber ID")

    return value.strip()
