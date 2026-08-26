import type { AddressObject, HeaderValue, ParsedMail, StructuredHeader } from 'mailparser';

/*
 * Legacy mailparser (0.6.x) exposed a flat mail object shape that the rest of
 * the pipeline (finalizeMessage in index.ts, IInboundParseDataDto, worker
 * strategies, customer-facing webhooks) still expects:
 *   - from/to/cc/bcc: Array<{ address, name }>
 *   - headers:        plain object of decoded string values keyed by
 *                     lowercased header name (IHeaders contract)
 *   - messageId/inReplyTo/references: bracketless message-ids
 *     (0.6.x stripped RFC 5322 angle brackets; 3.x adds them)
 *   - priority:       'normal' | 'low' | 'high'
 *   - attachments:    { filename, contentType, size, content: Buffer }
 * mailparser@3.x instead returns `ParsedMail` with `AddressObject` address
 * fields, a `Map<string, HeaderValue>` of structured header values, and
 * bracketed message-ids. `normalizeParsedMail` maps 3.x output back to the
 * legacy-compatible shape so upgrading mailparser (for GHSA-7gmj-h9xc-mcxc)
 * doesn't cascade into the worker or change customer webhook payloads.
 */

export interface LegacyAddress {
  address: string;
  name: string;
}

export interface LegacyAttachment {
  filename: string;
  contentType: string;
  size: number;
  content: Buffer;
}

export interface NormalizedMail {
  html: string;
  text: string;
  headers: Record<string, string | string[]>;
  subject: string;
  messageId: string;
  inReplyTo?: string;
  references?: string[];
  priority: string;
  from: LegacyAddress[];
  to: LegacyAddress[];
  cc: LegacyAddress[];
  bcc: LegacyAddress[];
  date?: Date;
  attachments: LegacyAttachment[];
  [key: string]: unknown;
}

function isAddressObject(value: object): value is AddressObject {
  return 'value' in value && 'text' in value && 'html' in value;
}

function isStructuredHeader(value: object): value is StructuredHeader {
  return 'value' in value && 'params' in value;
}

function structuredHeaderToString(header: StructuredHeader): string {
  const params = Object.entries(header.params ?? {}).map(([key, paramValue]) => `${key}=${paramValue}`);

  return [header.value, ...params].join('; ');
}

/*
 * Convert one mailparser@3 HeaderValue entry back to the decoded raw-string
 * representation that mailparser@0.6 stored in `parsedHeaders`. Address
 * headers use the formatted text rendering ('Name <addr@host>, ...'), which
 * is what 0.6 exposed for `headers.from` / `headers.to`.
 */
function headerEntryToString(value: string | Date | AddressObject | StructuredHeader): string {
  if (typeof value === 'string') {
    return value;
  }

  if (value instanceof Date) {
    return value.toUTCString();
  }

  if (isAddressObject(value)) {
    return value.text;
  }

  if (isStructuredHeader(value)) {
    return structuredHeaderToString(value);
  }

  return JSON.stringify(value);
}

function headerValueToLegacy(value: HeaderValue): string | string[] {
  if (Array.isArray(value)) {
    return value.map(headerEntryToString);
  }

  return headerEntryToString(value);
}

function headersToObject(headers: Map<string, HeaderValue> | undefined): Record<string, string | string[]> {
  const result: Record<string, string | string[]> = {};

  if (!headers) {
    return result;
  }

  for (const [key, value] of headers.entries()) {
    const legacyValue = headerValueToLegacy(value);

    /*
     * mailparser@3 splits the single References header line into an id array;
     * legacy exposed the raw whitespace-separated string (IHeaders.references).
     * Repeated headers such as Received legitimately stay arrays.
     */
    result[key] = key === 'references' && Array.isArray(legacyValue) ? legacyValue.join(' ') : legacyValue;
  }

  return result;
}

/* mailparser@0.6 stripped RFC 5322 angle brackets from message-ids; 3.x adds them. */
function stripAngleBrackets(messageId: string): string {
  return messageId.replace(/^<|>$/g, '').trim();
}

function normalizeMessageIdList(field: string | string[] | undefined): string[] {
  if (!field) {
    return [];
  }

  const entries = Array.isArray(field) ? field : field.split(/\s+/);

  return entries.map(stripAngleBrackets).filter(Boolean);
}

function flattenAddresses(field: AddressObject | AddressObject[] | undefined): LegacyAddress[] {
  if (!field) {
    return [];
  }

  const list = Array.isArray(field) ? field : [field];

  const addresses: LegacyAddress[] = [];
  for (const entry of list) {
    if (!entry || !Array.isArray(entry.value)) {
      continue;
    }
    for (const value of entry.value) {
      addresses.push({
        address: value.address ?? '',
        name: value.name ?? '',
      });
    }
  }

  return addresses;
}

function normalizeAttachments(attachments: ParsedMail['attachments'] | undefined): LegacyAttachment[] {
  if (!attachments || attachments.length === 0) {
    return [];
  }

  /*
   * Only the fields consumed downstream survive: attachment-uploader.ts reads
   * filename/contentType/content and re-emits its own slim shapes
   * (UploadedAttachment / InlineAttachment) before the job is enqueued.
   */
  return attachments.map((attachment) => ({
    filename: attachment.filename ?? '',
    contentType: attachment.contentType ?? 'application/octet-stream',
    size: attachment.size,
    content: attachment.content,
  }));
}

export function normalizeParsedMail(parsed: ParsedMail): NormalizedMail {
  /*
   * simpleParser only copies a fixed set of headers onto the mail object and
   * `priority` is not one of them — it exists solely in the headers map (as a
   * plain 'normal' | 'low' | 'high' string produced by parsePriority).
   */
  const priorityHeader = parsed.headers?.get('priority');
  const [inReplyTo] = normalizeMessageIdList(parsed.inReplyTo);
  const references = normalizeMessageIdList(parsed.references);

  return {
    html: parsed.html || '',
    text: parsed.text ?? '',
    headers: headersToObject(parsed.headers),
    subject: parsed.subject ?? '',
    messageId: stripAngleBrackets(parsed.messageId ?? ''),
    inReplyTo,
    references: references.length > 0 ? references : undefined,
    priority: typeof priorityHeader === 'string' ? priorityHeader : 'normal',
    from: flattenAddresses(parsed.from),
    to: flattenAddresses(parsed.to),
    cc: flattenAddresses(parsed.cc),
    bcc: flattenAddresses(parsed.bcc),
    date: parsed.date,
    attachments: normalizeAttachments(parsed.attachments),
  };
}
