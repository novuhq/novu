import { generateObjectId } from '@novu/application-generic';

/**
 * Which inbound-email resolution path produced the request log row. Maps to the
 * synthetic `path`/`url`/`url_pattern` of the logged request (`/inbound-mail/{strategy}`).
 */
export type InboundParseStrategy = 'reply-to' | 'domain-route' | 'agent';

/**
 * Terminal result of processing an inbound email, after the recipient has been
 * resolved to a tenant (organization + environment). This is the only state
 * that carries enough context to be tenant-scoped into the `requests` table.
 *
 * `status` overloads HTTP status codes to express the inbound outcome so the
 * existing dashboard status filter stays meaningful:
 * - `200` delivered (webhook/agent accepted, reply-to posted)
 * - `422` resolved but undeliverable (no matching route, validation/config error)
 * - `502` downstream delivery failure (webhook/agent/reply-to call failed)
 */
export interface InboundParseOutcome {
  organizationId: string;
  environmentId: string;
  transactionId: string;
  strategy: InboundParseStrategy;
  status: number;
  message?: string;
}

/**
 * Thrown by the inbound strategies for failures that occur *after* the tenant
 * has been resolved. It preserves throw-based BullMQ retry semantics for 5xx
 * outcomes while carrying resolved tenant context so the worker `failed`
 * handler can write exactly one terminal trace after retries exhaust. 4xx
 * outcomes are traced immediately inside `InboundEmailParse` and are not
 * rethrown.
 */
export class InboundParseProcessingError extends Error {
  constructor(
    message: string,
    public readonly outcome?: InboundParseOutcome
  ) {
    super(message);
    this.name = 'InboundParseProcessingError';
  }
}

/**
 * Thrown when the inbound mail server cannot route a message to any tenant
 * (e.g. shared agent inbox: unknown routing key, inactive agent, missing
 * integration link). Carries an optional reason for the trace `message`. The
 * worker's safety-net handler converts these into a terminal `request_failed`
 * trace using `command.requestLogId`. Non-retriable.
 */
export class InboundParseDroppedError extends Error {
  constructor(
    public readonly reason: string,
    public readonly tenant?: { organizationId?: string; environmentId?: string; transactionId?: string }
  ) {
    super(reason);
    this.name = 'InboundParseDroppedError';
  }
}

/**
 * Inbound emails arriving through the domain-route / agent paths have no native
 * Novu transaction id. We derive a deterministic id from the RFC 5322
 * Message-ID so retries of the same email collapse onto one logical request.
 */
export function inboundTransactionIdFromMessageId(messageId: string | undefined): string {
  const cleaned = messageId?.replace(/[<>]/g, '').trim();

  return cleaned || `inbound_${generateObjectId()}`;
}

/** Customer-visible message for downstream/system delivery failures (5xx). */
export const INBOUND_DELIVERY_FAILURE_CUSTOMER_MESSAGE = 'Inbound delivery failed due to a temporary internal error';

/** 5xx outcomes are retriable — terminal traces are written once retries exhaust. */
export function isRetriableInboundFailureStatus(status: number): boolean {
  return status >= 500;
}

export function toCustomerDeliveryFailureMessage(status: number, detailedMessage: string): string {
  if (isRetriableInboundFailureStatus(status)) {
    return INBOUND_DELIVERY_FAILURE_CUSTOMER_MESSAGE;
  }

  return detailedMessage;
}

export function getDeliveryFailureDiagnostics(err: unknown): {
  message: string;
  statusCode?: number;
  responseBody?: unknown;
} {
  if (err instanceof Error) {
    const httpErr = err as Error & { statusCode?: number; responseBody?: unknown };

    return {
      message: err.message,
      statusCode: typeof httpErr.statusCode === 'number' ? httpErr.statusCode : undefined,
      responseBody: httpErr.responseBody,
    };
  }

  return { message: typeof err === 'string' ? err : 'Unknown error' };
}
