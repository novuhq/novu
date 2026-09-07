/**
 * Shape of attachment objects delivered in domain-route and reply-to inbound email webhooks.
 *
 * Starting from the release where S3 attachment offloading was introduced, `url` is the
 * preferred way to download attachment content. Signed URL expiration depends on the
 * delivery path; URL-only inbound webhooks use a six-hour expiration and include
 * `expiresAt`. `content` and `contentBytes` are kept for one release cycle so existing
 * consumers do not break; both fields are `@deprecated` and will be removed in the next
 * major version.
 *
 * `url` is absent for self-hosted deployments that do not configure S3
 * (`S3_BUCKET_NAME` unset on the inbound-mail service). In that fallback mode the binary
 * travels inline in the legacy `content` field — same shape consumers received before S3
 * offloading was introduced.
 *
 * Migration guide — replace:
 *   `Buffer.from(att.content.data)`
 * with:
 *   `await fetch(att.url).then(r => r.arrayBuffer())`
 * and fall back to `content` when `url` is undefined.
 */
export interface InboundEmailAttachment {
  filename: string;
  contentType: string;
  /** File size in bytes. */
  size: number;
  /**
   * Presigned GET URL. URL-only inbound webhooks expire after six hours.
   * Absent on self-hosted deployments without S3 configured — fall back to `content` then.
   */
  url?: string;
  /**
   * ISO-8601 timestamp when `url` stops being valid. Present when Novu signed the URL
   * for webhook delivery.
   */
  expiresAt?: string;
  /**
   * @deprecated Use `url` to download the attachment. Will be removed in the next major version.
   * Raw file content in the legacy mailparser Buffer JSON format: `{ type: 'Buffer', data: number[] }`.
   * May be `null` if rehydration from S3 failed for this individual attachment.
   *
   * On self-hosted deployments without S3, this is the only place the binary content lives.
   */
  content?: { type: 'Buffer'; data: number[] } | null;
  /**
   * @deprecated Use `size` instead. Will be removed in the next major version.
   */
  contentBytes?: number;
}
