"""Route agent bridge events to registered handlers."""

from __future__ import annotations

import logging
from typing import Never

import httpx

from novu_framework.agent import RegisteredAgent
from novu_framework.context import AgentContextImpl
from novu_framework.errors import InvalidActionError, to_agent_error
from novu_framework.transport import create_transport
from novu_framework.types import AgentBridgeRequest, AgentEventName

logger = logging.getLogger(__name__)

AGENT_EVENTS: list[AgentEventName] = ["onMessage", "onAction", "onReaction", "onResolve"]


async def dispatch_agent_event(
    *,
    agent: RegisteredAgent,
    event: AgentEventName,
    bridge: AgentBridgeRequest,
    secret_key: str,
    http_client: httpx.AsyncClient,
) -> None:
    transport = create_transport(bridge, secret_key, http_client=http_client)
    ctx = AgentContextImpl(bridge, transport)

    try:
        ctx.queue_run_start()
        await _run_agent_handler(agent, event, ctx)
        await ctx.flush()
        await ctx.emit_run_finish(outcome="completed")
    except Exception as err:
        error = to_agent_error(err)
        logger.error(
            "[agent:%s] Turn failed (%s): %s",
            agent.id,
            event,
            error.message,
            exc_info=error.cause,
        )

        reported = False
        if agent.handlers.on_error:
            try:
                result = await agent.handlers.on_error(error, ctx)
                if isinstance(result, str) and result:
                    await ctx.reply(result)
                    reported = True
            except Exception as on_error_err:
                logger.error("[agent:%s] on_error failed: %s", agent.id, on_error_err)

        if not reported:
            await ctx.report_turn_error(error.message)
        else:
            await ctx.emit_run_finish(outcome="completed")
    finally:
        try:
            await ctx.typing_stop()
            await ctx.flush()
        except Exception:
            pass


async def _run_agent_handler(
    agent: RegisteredAgent, event: AgentEventName, ctx: AgentContextImpl
) -> None:
    handlers = agent.handlers

    match event:
        case "onMessage":
            if ctx.message is None:
                raise ValueError("onMessage requires message")

            result = await handlers.on_message(ctx.message, ctx)
            if isinstance(result, str):
                await ctx.reply(result)

        case "onAction":
            if ctx.action is None:
                return

            if handlers.on_action:
                result = await handlers.on_action(ctx.action, ctx)
                if isinstance(result, str):
                    await ctx.reply(result)

        case "onReaction":
            if ctx.reaction is None:
                return

            if handlers.on_reaction:
                result = await handlers.on_reaction(ctx.reaction, ctx)
                if isinstance(result, str):
                    await ctx.reply(result)

        case "onResolve":
            if handlers.on_resolve:
                result = await handlers.on_resolve(ctx)
                if isinstance(result, str):
                    await ctx.reply(result)

        case _ as unreachable:
            _assert_never(unreachable, event)


def _assert_never(value: Never, raw_event: str) -> Never:
    raise InvalidActionError(raw_event, AGENT_EVENTS)
