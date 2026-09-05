import asyncio
import json
import time
from pathlib import Path
from unittest.mock import AsyncMock

import httpx
import pytest

from novu_framework.agent import AgentHandlers, agent
from novu_framework.client import Client, ClientOptions
from novu_framework.handler import NovuRequestHandler, ServeOptions
from novu_framework.hmac import create_hmac_hex, json_stringify_payload

FIXTURES = Path(__file__).parent / "fixtures"


def _fixture_body() -> bytes:
    return (FIXTURES / "bridge_request.json").read_bytes()


def _mock_http_client(events: list[dict[str, object]]) -> httpx.AsyncClient:
    async def handler(request: httpx.Request) -> httpx.Response:
        if request.url.path.endswith("/events/ingest"):
            payload = json.loads(request.content.decode("utf-8"))
            events.extend(payload["events"])

            return httpx.Response(200, json={})

        if request.url.path.endswith("/reply"):
            return httpx.Response(200, json={"messageId": "msg-1", "platformThreadId": "thread-1"})

        return httpx.Response(404, json={"error": "unexpected request"})

    transport = httpx.MockTransport(handler)

    return httpx.AsyncClient(transport=transport)


@pytest.mark.asyncio
async def test_agent_event_acks_immediately_and_runs_handler():
    on_message = AsyncMock(return_value="pong")
    sent_events: list[dict[str, object]] = []
    test_bot = agent(
        "test-bot",
        AgentHandlers(on_message=on_message),
    )

    http_client = _mock_http_client(sent_events)
    handler = NovuRequestHandler(
        ServeOptions(
            client=Client(ClientOptions(secret_key="sk_test", strict_authentication=False)),
            agents=[test_bot],
            http_client=http_client,
        )
    )

    url = "http://localhost/api/novu?action=agent-event&agentId=test-bot&event=onMessage"

    response = await handler.handle(method="POST", url=url, headers={}, body=_fixture_body())

    assert response.status == 200
    assert json.loads(response.body) == {"status": "ack"}

    for _ in range(50):
        if on_message.await_count == 1:
            break
        await asyncio.sleep(0.01)

    assert on_message.await_count == 1

    for _ in range(50):
        if sent_events:
            break
        await asyncio.sleep(0.01)

    assert [event["event"]["type"] for event in sent_events] == [
        "run-start",
        "message",
        "run-finish",
        "channel.typing",
    ]

    await http_client.aclose()


@pytest.mark.asyncio
async def test_health_check():
    handler = NovuRequestHandler(
        ServeOptions(
            client=Client(ClientOptions(strict_authentication=False)), agents=[]
        )
    )
    response = await handler.handle(
        method="GET",
        url="http://localhost/api/novu?action=health-check",
        headers={},
    )

    assert response.status == 200
    assert json.loads(response.body)["status"] == "ok"


@pytest.mark.asyncio
async def test_hmac_required_when_strict():
    payload = {"hello": "world"}
    secret = "sk_test"
    timestamp = int(time.time() * 1000)
    digest = create_hmac_hex(secret, f"{timestamp}.{json_stringify_payload(payload)}")
    header = f"t={timestamp},v1={digest}"

    handler = NovuRequestHandler(
        ServeOptions(
            client=Client(ClientOptions(secret_key=secret, strict_authentication=True)),
            agents=[],
        )
    )

    response = await handler.handle(
        method="POST",
        url="http://localhost/api/novu?action=agent-event&agentId=missing&event=onMessage",
        headers={"novu-signature": header},
        body=json_stringify_payload(payload).encode("utf-8"),
    )

    assert response.status == 404


@pytest.mark.asyncio
async def test_invalid_json_body_returns_400():
    handler = NovuRequestHandler(
        ServeOptions(
            client=Client(ClientOptions(secret_key="sk_test", strict_authentication=False)),
            agents=[],
        )
    )

    response = await handler.handle(
        method="POST",
        url="http://localhost/api/novu?action=agent-event&agentId=test-bot&event=onMessage",
        headers={},
        body=b"{invalid",
    )

    assert response.status == 400
    assert json.loads(response.body)["code"] == "INVALID_REQUEST"


@pytest.mark.asyncio
async def test_event_mode_emits_signal_and_resolve_events():
    sent_events: list[dict[str, object]] = []

    async def on_message(message, ctx):  # type: ignore[no-untyped-def]
        ctx.ask("Need approval?")
        ctx.resolve("Handled")

        return f"Echo: {message.text}"

    http_client = _mock_http_client(sent_events)
    handler = NovuRequestHandler(
        ServeOptions(
            client=Client(ClientOptions(secret_key="sk_test", strict_authentication=False)),
            agents=[agent("test-bot", AgentHandlers(on_message=on_message))],
            http_client=http_client,
        )
    )

    response = await handler.handle(
        method="POST",
        url="http://localhost/api/novu?action=agent-event&agentId=test-bot&event=onMessage",
        headers={},
        body=_fixture_body(),
    )

    assert response.status == 200

    for _ in range(50):
        if sent_events:
            break
        await asyncio.sleep(0.01)

    assert [event["event"]["type"] for event in sent_events] == [
        "run-start",
        "signal",
        "resolve",
        "message",
        "run-finish",
        "channel.typing",
    ]
    assert sent_events[1]["event"]["signal"]["type"] == "human"

    await http_client.aclose()
