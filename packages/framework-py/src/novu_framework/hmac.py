"""HMAC verification for Novu bridge requests."""

from __future__ import annotations

import hashlib
import hmac
import json
import time
from typing import Any

from novu_framework.errors import (
    SignatureExpiredError,
    SignatureInvalidError,
    SignatureMismatchError,
    SignatureNotFoundError,
    SigningKeyNotFoundError,
)

SIGNATURE_TIMESTAMP_TOLERANCE_MS = 5 * 60 * 1000


def parse_signature_header(header: str) -> tuple[int | None, str | None]:
    fields: dict[str, str] = {}

    for raw_part in header.split(","):
        part = raw_part.strip()
        if not part:
            continue

        eq_idx = part.find("=")
        if eq_idx <= 0:
            continue

        key = part[:eq_idx]
        value = part[eq_idx + 1 :]
        if key and value and key not in fields:
            fields[key] = value

    t_raw = fields.get("t")
    t = int(t_raw) if t_raw is not None and t_raw.isdigit() else None
    v1 = fields.get("v1")

    return t, v1


def json_stringify_payload(payload: Any) -> str:
    """Serialize like JavaScript JSON.stringify (compact, no ASCII escaping)."""

    return json.dumps(payload, separators=(",", ":"), ensure_ascii=False)


def create_hmac_hex(secret_key: str, data: str) -> str:
    digest = hmac.new(secret_key.encode("utf-8"), data.encode("utf-8"), hashlib.sha256).hexdigest()

    return digest


def validate_hmac(payload: Any, signature_header: str | None, secret_key: str | None) -> None:
    if not signature_header:
        raise SignatureNotFoundError()

    if not secret_key:
        raise SigningKeyNotFoundError()

    timestamp, v1 = parse_signature_header(signature_header)
    if v1 is None or timestamp is None:
        raise SignatureInvalidError()

    now_ms = int(time.time() * 1000)
    if timestamp < now_ms - SIGNATURE_TIMESTAMP_TOLERANCE_MS or timestamp > now_ms + SIGNATURE_TIMESTAMP_TOLERANCE_MS:
        raise SignatureExpiredError()

    signed = f"{timestamp}.{json_stringify_payload(payload)}"
    local_hash = create_hmac_hex(secret_key, signed)

    if not hmac.compare_digest(local_hash, v1):
        raise SignatureMismatchError()
