/** Base class for all agent runtime errors. */
export abstract class AgentRuntimeError extends Error {
  abstract readonly code: string;

  constructor(
    message: string,
    readonly providerId: string,
    /** Upstream provider request ID, useful for support correlation */
    readonly requestId?: string
  ) {
    super(message);
    this.name = this.constructor.name;
  }
}

/** 401 — API key is invalid, revoked, or was never valid */
export class AgentRuntimeUnauthorizedError extends AgentRuntimeError {
  readonly code = 'AGENT_RUNTIME_UNAUTHORIZED' as const;
}

/** 403 — The key exists but lacks permission for the required workspace/operation */
export class AgentRuntimeForbiddenError extends AgentRuntimeError {
  readonly code = 'AGENT_RUNTIME_FORBIDDEN' as const;
}

/** 404 — The externalAgentId no longer exists on the provider side (drifted state) */
export class AgentRuntimeNotFoundError extends AgentRuntimeError {
  readonly code = 'AGENT_RUNTIME_NOT_FOUND' as const;
}

/** 429 — Provider is rate-limiting requests */
export class AgentRuntimeRateLimitedError extends AgentRuntimeError {
  readonly code = 'AGENT_RUNTIME_RATE_LIMITED' as const;

  constructor(
    message: string,
    providerId: string,
    /** Milliseconds until the rate limit resets, parsed from the Retry-After header */
    readonly retryAfterMs: number,
    requestId?: string
  ) {
    super(message, providerId, requestId);
  }
}

/** 529 (Anthropic-specific) — Provider is temporarily overloaded */
export class AgentRuntimeOverloadedError extends AgentRuntimeError {
  readonly code = 'AGENT_RUNTIME_OVERLOADED' as const;
}

/** 5xx — Provider returned a server error */
export class AgentRuntimeServiceUnavailableError extends AgentRuntimeError {
  readonly code = 'AGENT_RUNTIME_SERVICE_UNAVAILABLE' as const;
}

/** Request timed out before the provider responded */
export class AgentRuntimeTimeoutError extends AgentRuntimeError {
  readonly code = 'AGENT_RUNTIME_TIMEOUT' as const;
}

/** DNS/TLS/connection failure before a response was received */
export class AgentRuntimeNetworkError extends AgentRuntimeError {
  readonly code = 'AGENT_RUNTIME_NETWORK' as const;
}

/** 400 / 422 — The request was malformed (bad model name, invalid MCP URL, etc.) */
export class AgentRuntimeBadRequestError extends AgentRuntimeError {
  readonly code = 'AGENT_RUNTIME_BAD_REQUEST' as const;
}

/** Catch-all for unexpected errors */
export class AgentRuntimeUnknownError extends AgentRuntimeError {
  readonly code = 'AGENT_RUNTIME_UNKNOWN' as const;
}

/**
 * Thrown by `BaseAgentRuntimeProvider` defaults when a method gated on a
 * capability flag (e.g. `tokenVault`) is invoked on a provider that did not
 * override it. Callers MUST check `capabilities.<flag>` before calling
 * capability-bound methods.
 */
export class UnsupportedCapabilityError extends AgentRuntimeError {
  readonly code = 'AGENT_RUNTIME_UNSUPPORTED_CAPABILITY' as const;

  constructor(
    /** Capability flag the caller failed to gate on. */
    readonly capability: string,
    providerId: string
  ) {
    super(`Provider "${providerId}" does not support capability "${capability}".`, providerId);
  }
}

export type AgentRuntimeErrorCode =
  | 'AGENT_RUNTIME_UNAUTHORIZED'
  | 'AGENT_RUNTIME_FORBIDDEN'
  | 'AGENT_RUNTIME_NOT_FOUND'
  | 'AGENT_RUNTIME_RATE_LIMITED'
  | 'AGENT_RUNTIME_OVERLOADED'
  | 'AGENT_RUNTIME_SERVICE_UNAVAILABLE'
  | 'AGENT_RUNTIME_TIMEOUT'
  | 'AGENT_RUNTIME_NETWORK'
  | 'AGENT_RUNTIME_BAD_REQUEST'
  | 'AGENT_RUNTIME_UNSUPPORTED_CAPABILITY'
  | 'AGENT_RUNTIME_UNKNOWN';
