import type { AgentHistoryEntry } from '../../resources/agent/agent.types';
import { isImageMediaType, parseUserHistoryAttachments } from '../../resources/agent/history-attachments';

export type LangChainImagePart = {
  type: 'image';
  url: string;
  mimeType: string;
};

export type LangChainFilePart = {
  type: 'file';
  url: string;
  mimeType: string;
  metadata?: { title: string };
};

export type LangChainAttachmentPart = LangChainImagePart | LangChainFilePart;

/**
 * Build LangChain multimodal content blocks from the signed attachments on a
 * user history entry. Images become `{ type: 'image', url }` and PDFs become
 * `{ type: 'file', url }` so ChatAnthropic / ChatOpenAI can translate them.
 * Returns an empty array when there is nothing usable.
 */
export function mapUserAttachmentParts(entry: AgentHistoryEntry): LangChainAttachmentPart[] {
  return parseUserHistoryAttachments(entry).map((attachment) => {
    if (isImageMediaType(attachment.mediaType)) {
      return {
        type: 'image',
        url: attachment.url,
        mimeType: attachment.mediaType,
      };
    }

    return {
      type: 'file',
      url: attachment.url,
      mimeType: attachment.mediaType,
      ...(attachment.name ? { metadata: { title: attachment.name } } : {}),
    };
  });
}
