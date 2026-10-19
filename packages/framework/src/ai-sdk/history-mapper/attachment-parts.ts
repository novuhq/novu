import type { FilePart } from 'ai';
import type { AgentHistoryEntry } from '../../resources/agent/agent.types';
import { parseUserHistoryAttachments } from '../../resources/agent/history-attachments';

/**
 * Build AI SDK file parts from the signed attachments on a user history entry.
 * The bridge already signs each inbound file onto `richContent.attachments`
 * (`{ type, url, name, mimeType, size }`). URLs are passed through as `FilePart.data`.
 * Call `hydrateUnreachableAttachmentUrls` before `generateText` so http/localhost
 * URLs are inlined as bytes. Non-whitelisted or malformed entries are skipped.
 */
export function mapUserAttachmentParts(entry: AgentHistoryEntry): FilePart[] {
  return parseUserHistoryAttachments(entry).map((attachment) => ({
    type: 'file',
    data: new URL(attachment.url),
    mediaType: attachment.mediaType,
    ...(attachment.name ? { filename: attachment.name } : {}),
  }));
}
