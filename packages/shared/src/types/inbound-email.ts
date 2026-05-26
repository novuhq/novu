/**
 * Shape of attachment objects delivered in domain-route and reply-to inbound email webhooks.
 *
 * Starting from the release where S3 attachment offloading was introduced, `url` and `size`
 * are always present. `content` and `contentBytes` are kept for one release cycle so existing
 * consumers do not break; both fields are `@deprecated` and will be removed in the next major version.
 *
 * Migration guide — replace:
 *   `Buffer.from(att.content.data)`
 * with:
 *   `await fetch(att.url).then(r => r.arrayBuffer())`
 */
export interface InboundEmailAttachment {
  filename: string;
  contentType: string;
  /** File size in bytes. */
  size: number;
  /** Presigned GET URL valid for up to 7 days. Use this to download the attachment. */
  url: string;
  /**
   * Internal S3 object key. Stable for the lifetime of the object (see bucket lifecycle policy).
   * Useful if you want to reference the file independently of the presigned URL TTL.
   */
  storagePath: string;
  /**
   * @deprecated Use `url` to download the attachment. Will be removed in the next major version.
   * Raw file content in the legacy mailparser Buffer JSON format: `{ type: 'Buffer', data: number[] }`.
   * May be `null` if rehydration from S3 failed for this individual attachment.
   */
  content?: { type: 'Buffer'; data: number[] } | null;
  /**
   * @deprecated Use `size` instead. Will be removed in the next major version.
   */
  contentBytes?: number;
}
