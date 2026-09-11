"""Agent registration factory."""

from __future__ import annotations

from collections.abc import Awaitable, Callable
from dataclasses import dataclass
from typing import Any

from novu_framework.types import (
    AgentAction,
    AgentMessage,
    AgentReaction,
)

MessageContent = str

OnMessageHandler = Callable[[AgentMessage, Any], Awaitable[MessageContent | None]]
OnActionHandler = Callable[[AgentAction, Any], Awaitable[MessageContent | None]]
OnReactionHandler = Callable[[AgentReaction, Any], Awaitable[MessageContent | None]]
OnResolveHandler = Callable[[Any], Awaitable[MessageContent | None]]
OnErrorHandler = Callable[[Exception, Any], Awaitable[str | MessageContent | None]]


@dataclass(frozen=True, slots=True)
class AgentHandlers:
    on_message: OnMessageHandler
    on_action: OnActionHandler | None = None
    on_reaction: OnReactionHandler | None = None
    on_resolve: OnResolveHandler | None = None
    on_error: OnErrorHandler | None = None


@dataclass(frozen=True, slots=True)
class RegisteredAgent:
    id: str
    handlers: AgentHandlers


def agent(agent_id: str, handlers: AgentHandlers) -> RegisteredAgent:
    if not agent_id:
        raise ValueError("agent() requires a non-empty agentId")

    if handlers.on_message is None:
        raise ValueError(f"agent('{agent_id}') requires an on_message handler")

    return RegisteredAgent(id=agent_id, handlers=handlers)
