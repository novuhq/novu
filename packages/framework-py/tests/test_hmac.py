import json
import time
from pathlib import Path

import pytest

from novu_framework.errors import SignatureMismatchError
from novu_framework.hmac import (
    create_hmac_hex,
    json_stringify_payload,
    parse_signature_header,
    validate_hmac,
)

FIXTURES = Path(__file__).parent / "fixtures"


def test_parse_signature_header():
    t, v1 = parse_signature_header("t=1700000000000,v1=abc123")

    assert t == 1700000000000
    assert v1 == "abc123"


def test_validate_hmac_roundtrip():
    payload = {"hello": "world", "n": 1}
    secret = "test-secret"
    timestamp = int(time.time() * 1000)
    signed = f"{timestamp}.{json_stringify_payload(payload)}"
    digest = create_hmac_hex(secret, signed)
    header = f"t={timestamp},v1={digest}"

    validate_hmac(payload, header, secret)


def test_validate_hmac_mismatch():
    payload = {"hello": "world"}
    secret = "test-secret"
    timestamp = int(time.time() * 1000)
    header = f"t={timestamp},v1=deadbeef"

    with pytest.raises(SignatureMismatchError):
        validate_hmac(payload, header, secret)


def test_validate_hmac_uses_compare_digest():
    """Verify that hmac.compare_digest is used (no hand-rolled timing_safe_equal)."""
    import novu_framework.hmac as hmac_mod

    assert not hasattr(hmac_mod, "timing_safe_equal"), (
        "Hand-rolled timing_safe_equal should be removed in favor of hmac.compare_digest"
    )


def test_bridge_fixture_matches_types():
    from novu_framework.types import AgentBridgeRequest

    raw = json.loads((FIXTURES / "bridge_request.json").read_text())
    bridge = AgentBridgeRequest.model_validate(raw)

    assert bridge.agentId == "test-bot"
    assert bridge.message is not None
    assert bridge.message.text == "Hello bot!"
