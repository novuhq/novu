"""Framework errors mirroring @novu/framework bridge error taxonomy."""

from __future__ import annotations


class FrameworkError(Exception):
    status_code: int = 500
    code: str = "FRAMEWORK_ERROR"

    def __init__(self, message: str, *, data: dict | None = None) -> None:
        super().__init__(message)
        self.message = message
        self.data = data or {}


class SignatureNotFoundError(FrameworkError):
    status_code = 401
    code = "SIGNATURE_NOT_FOUND"

    def __init__(self) -> None:
        super().__init__("Missing Novu-Signature header")


class SigningKeyNotFoundError(FrameworkError):
    status_code = 401
    code = "SIGNING_KEY_NOT_FOUND"

    def __init__(self) -> None:
        super().__init__("Missing NOVU_SECRET_KEY")


class SignatureInvalidError(FrameworkError):
    status_code = 401
    code = "SIGNATURE_INVALID"

    def __init__(self) -> None:
        super().__init__("Invalid Novu-Signature header")


class SignatureExpiredError(FrameworkError):
    status_code = 401
    code = "SIGNATURE_EXPIRED"

    def __init__(self) -> None:
        super().__init__("Novu-Signature timestamp expired")


class SignatureMismatchError(FrameworkError):
    status_code = 401
    code = "SIGNATURE_MISMATCH"

    def __init__(self) -> None:
        super().__init__("Novu-Signature mismatch")


class InvalidActionError(FrameworkError):
    status_code = 400
    code = "INVALID_ACTION"

    def __init__(self, action: str, allowed: list[str]) -> None:
        super().__init__(f"Invalid action '{action}'", data={"action": action, "allowed": allowed})


class InvalidRequestError(FrameworkError):
    status_code = 400
    code = "INVALID_REQUEST"

    def __init__(self, message: str) -> None:
        super().__init__(message)


class AgentNotFoundError(FrameworkError):
    status_code = 404
    code = "AGENT_NOT_FOUND"

    def __init__(self, agent_id: str) -> None:
        super().__init__(f"Agent '{agent_id}' not registered", data={"agentId": agent_id})


class AgentDeliveryError(Exception):
    def __init__(self, status_code: int, body: str) -> None:
        super().__init__(f"Agent delivery failed ({status_code}): {body}")
        self.status_code = status_code
        self.body = body


class AgentError(Exception):
    def __init__(self, message: str, *, cause: BaseException | None = None) -> None:
        super().__init__(message)
        self.message = message
        self.cause = cause


def to_agent_error(err: BaseException) -> AgentError:
    if isinstance(err, AgentError):
        return err

    return AgentError(str(err), cause=err if isinstance(err, Exception) else None)
