"""Playground agents — Python ports of the Next.js playground agents."""

from __future__ import annotations

import os

from novu_framework import AgentHandlers, agent
from novu_framework.context import AgentContextImpl
from novu_framework.types import AgentAction, AgentMessage, AgentReaction


# ---------------------------------------------------------------------------
# support-bot — simple echo agent
# ---------------------------------------------------------------------------

async def _on_support_message(message: AgentMessage, ctx: AgentContextImpl) -> str:
    return f"You said: {message.text}"


support_bot_agent = agent(
    "support-bot",
    AgentHandlers(on_message=_on_support_message),
)


# ---------------------------------------------------------------------------
# human-hitl — HITL demo mirroring the Next.js playground agent
# ---------------------------------------------------------------------------

def _format_human_response(response: object) -> str:
    """Render a human-interaction verdict the same way the TS playground does."""
    kind = getattr(response, "kind", "unknown")
    status = getattr(response, "status", "unknown")
    expired = getattr(response, "expired", False)

    if expired:
        return f"That {kind} request expired before I got an answer."

    detail = getattr(response, "text", None) or getattr(response, "optionId", None)

    if detail:
        return f"Got it — {kind} is **{status}** ({detail})."

    return f"Got it — {kind} is **{status}**."


_HELP_TEXT = "\n".join([
    "Framework HITL demo. Message me with one of:",
    "- `approve` — `ctx.approve(\"Deploy v2.4.1 to production?\")`",
    "- `multi-approve` — `ctx.approve(\"Deploy v2.4.1 to production?\", to=[...])`",
    "- `ask` — `ctx.ask(\"What environment should we deploy to?\")`",
    "- `choose` — `ctx.choose(\"Which region?\", [\"us-east\", \"eu-west\", \"ap-south\"])`",
    "- `tell` — `ctx.tell(\"Deploy finished. v2.4.1 is live.\")`",
])


async def _on_hitl_message(message: AgentMessage, ctx: AgentContextImpl) -> str:
    if ctx.human_response:
        return _format_human_response(ctx.human_response)

    text = message.text.strip().lower()

    if "multi-approve" in text:
        raw = os.environ.get("HITL_SENT_TO", "")
        to = [s.strip() for s in raw.split(",") if s.strip()]
        if to:
            ctx.approve("Deploy v2.4.1 to production?", to=to)
        else:
            ctx.approve("Deploy v2.4.1 to production?")

        return "Sent an approval card in this thread. Approve or deny it to continue."

    if "approve" in text:
        ctx.approve("Deploy v2.4.1 to production?")

        return "Sent an approval card in this thread. Approve or deny it to continue."

    if "choose" in text:
        ctx.choose("Which region should we deploy to?", ["us-east", "eu-west", "ap-south"])

        return "Pick a region on the card in this thread."

    if "tell" in text:
        ctx.tell("Deploy finished. v2.4.1 is live.")

        return "Posted a one-way notice. Nothing to wait on."

    if "ask" in text:
        ctx.ask("What environment should we deploy to?")

        return "Asked a question in this thread. Reply with the environment name."

    return _HELP_TEXT


async def _on_hitl_action(_action: AgentAction, ctx: AgentContextImpl) -> str | None:
    if ctx.human_response:
        return _format_human_response(ctx.human_response)

    return None


human_hitl_agent = agent(
    "human-hitl",
    AgentHandlers(
        on_message=_on_hitl_message,
        on_action=_on_hitl_action,
    ),
)
