import { generateObjectId } from '@novu/application-generic';
import { InboundEmailParseCommand } from './inbound-email-parse.command';

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
 * has been resolved. It preserves the existing throw-based BullMQ retry
 * semantics while carrying the resolved context so the centralized emit point
 * in `InboundEmailParse` can still write a request log row for the failure.
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
 * Inbound emails arriving through the domain-route / agent paths have no native
 * Novu transaction id. We derive a deterministic id from the RFC 5322
 * Message-ID so retries of the same email collapse onto one logical request.
 */
export function inboundTransactionIdFromMessageId(messageId: string | undefined): string {
  const cleaned = messageId?.replace(/[<>]/g, '').trim();

  return cleaned || `inbound_${generateObjectId()}`;
}

/**
 * Metadata-only snapshot of an inbound email for the `request_body` column.
 * Deliberately excludes the raw `html`/`text` bodies to keep PII out of the
 * analytics store (the inbound-mail service keeps PII out of APM for the same reason).
 */
export function buildInboundRequestMetadata(command: InboundEmailParseCommand): string {
  const metadata = {
    subject: command.subject,
    messageId: command.messageId,
    from: command.from?.map((sender) => sender.address),
    to: command.to?.map((recipient) => recipient.address),
    dkim: command.dkim,
    spf: command.spf,
    spamScore: command.spamScore,
    attachments: command.attachments?.map((attachment) => ({
      filename: attachment.filename,
      contentType: attachment.contentType,
      size: attachment.size,
    })),
  };

  return JSON.stringify(metadata);
}
