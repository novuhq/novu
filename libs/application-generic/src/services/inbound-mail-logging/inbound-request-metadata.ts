import { IInboundParseDataDto } from '../../dtos/inbound-parse-job.dto';

/**
 * Path-style identifier for an inbound mail processing strategy. Mirrored into
 * the `requests` table `path` column so the dashboard "Requests" view can group
 * inbound mail by the resolution path that produced the row.
 */
export type InboundParseStrategy = 'reply-to' | 'domain-route' | 'agent';

const REPLY_TO_DELIMITER = '-nv-e=';

/**
 * Light-weight inbound message shape that the request log can consume from
 * either the worker (`InboundEmailParseCommand`) or the inbound-mail server
 * (the finalized message before it is added to the queue).
 */
export type InboundRequestSource = Pick<
  IInboundParseDataDto,
  'subject' | 'messageId' | 'from' | 'to' | 'dkim' | 'spf' | 'spamScore' | 'attachments' | 'connection'
>;

/**
 * Metadata snapshot of an inbound email for the `requests.request_body` column.
 * Excludes raw `html`/`text` bodies (same boundary as inbound-mail APM). Includes
 * routing fields (`from`, `to`, `subject`) so tenant-scoped Requests debugging works;
 * retention follows the `requests` table TTL policy.
 */
export function buildInboundRequestMetadata(source: InboundRequestSource): string {
  const metadata = {
    subject: source.subject,
    messageId: source.messageId,
    from: source.from?.map((sender) => sender.address),
    to: source.to?.map((recipient) => recipient.address),
    dkim: source.dkim,
    spf: source.spf,
    spamScore: source.spamScore,
    attachments: source.attachments?.map((attachment) => ({
      filename: attachment.filename,
      contentType: attachment.contentType,
      size: attachment.size,
    })),
  };

  return JSON.stringify(metadata);
}

/**
 * Decide which strategy will process an address based on its shape. Used by
 * inbound-mail to set the synthetic `path` on the early request log row before
 * the worker actually runs the strategy.
 *
 * Note: `agent` is a worker-only sub-classification of domain-route — we cannot
 * tell it apart at the inbound-mail layer without DB lookups, so domain-route
 * is the conservative default. The worker emits its terminal trace with the
 * resolved strategy, so the request detail view still shows the correct outcome.
 */
export function inferInboundParseStrategy(toAddress: string): InboundParseStrategy {
  return toAddress.includes(REPLY_TO_DELIMITER) ? 'reply-to' : 'domain-route';
}

/**
 * Reply-to addresses encode the Novu environmentId in the local-part:
 *   parse+{transactionId}-nv-e={environmentId}@{domain}
 *
 * Returns null when the address is malformed; callers should treat the message
 * as untenant-scoped (the row is still created so the message is not lost).
 */
export function parseReplyToAddress(address: string): {
  domain: string;
  transactionId: string;
  environmentId: string;
} | null {
  if (!address) {
    return null;
  }

  const [user, domain] = address.split('@');
  if (!user || !domain) {
    return null;
  }

  const toMetaIds = user.split('+')[1];
  if (!toMetaIds) {
    return null;
  }

  const [transactionId, environmentId] = toMetaIds.split(REPLY_TO_DELIMITER);
  if (!transactionId || !environmentId) {
    return null;
  }

  return { domain, transactionId, environmentId };
}
