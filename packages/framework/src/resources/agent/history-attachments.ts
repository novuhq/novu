import type { AgentHistoryEntry } from './agent.types';

/**
 * Media types Claude (and other multimodal providers) can consume natively.
 * Everything else stays text-only so a stray attachment never breaks the call.
 */
const IMAGE_MEDIA_TYPES = new Set(['image/jpeg', 'image/png', 'image/gif', 'image/webp']);
const PDF_MEDIA_TYPE = 'application/pdf';

export interface HistoryAttachment {
  url: string;
  mediaType: string;
  name?: string;
}

export function isImageMediaType(mediaType: string): boolean {
  return IMAGE_MEDIA_TYPES.has(mediaType);
}

/** Lowercase the media type and strip any `; charset=…` parameters. */
function normalizeMediaType(mimeType: unknown): string | undefined {
  if (typeof mimeType !== 'string') {
    return undefined;
  }

  const normalized = mimeType.split(';')[0]?.trim().toLowerCase();

  return normalized || undefined;
}

function toHistoryAttachment(item: unknown): HistoryAttachment | undefined {
  if (!item || typeof item !== 'object') {
    return undefined;
  }

  const att = item as Record<string, unknown>;
  const mediaType = normalizeMediaType(att.mimeType);

  if (!mediaType || (!isImageMediaType(mediaType) && mediaType !== PDF_MEDIA_TYPE)) {
    return undefined;
  }

  if (typeof att.url !== 'string' || !att.url) {
    return undefined;
  }

  try {
    new URL(att.url);
  } catch {
    return undefined;
  }

  return { url: att.url, mediaType, name: typeof att.name === 'string' ? att.name : undefined };
}

/**
 * Signed inbound files on a user history entry (`richContent.attachments`).
 * The bridge already signs each file as `{ type, url, name, mimeType, size }`.
 * Non-whitelisted or malformed entries are skipped.
 */
export function parseUserHistoryAttachments(entry: AgentHistoryEntry): HistoryAttachment[] {
  const rawAttachments = entry.richContent?.attachments;

  if (!Array.isArray(rawAttachments)) {
    return [];
  }

  const attachments: HistoryAttachment[] = [];

  for (const item of rawAttachments) {
    const attachment = toHistoryAttachment(item);

    if (attachment) {
      attachments.push(attachment);
    }
  }

  return attachments;
}
