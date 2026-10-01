import type { FilePart, ModelMessage } from 'ai';
import { fetchUnreachableAttachmentBytes, isProviderFetchableUrl } from '../../resources/agent/attachment-url';

function filePartUrl(part: FilePart): string | undefined {
  if (part.data instanceof URL) {
    return part.data.toString();
  }

  return undefined;
}

async function hydrateFilePart(part: FilePart): Promise<FilePart | null> {
  const url = filePartUrl(part);
  if (!url || isProviderFetchableUrl(url)) {
    return part;
  }

  const data = await fetchUnreachableAttachmentBytes(url);
  if (!data) {
    return null;
  }

  return { ...part, data };
}

/**
 * Replace attachment URLs a hosted model cannot fetch with inline bytes.
 * HTTPS public URLs are left as-is so production signed S3 links stay URL-based.
 * Over-budget downloads are omitted so one large file cannot abort the turn.
 */
export async function hydrateUnreachableAttachmentUrls(messages: ModelMessage[]): Promise<ModelMessage[]> {
  return Promise.all(
    messages.map(async (message) => {
      if (message.role !== 'user' || typeof message.content === 'string' || !Array.isArray(message.content)) {
        return message;
      }

      const content = (
        await Promise.all(message.content.map((part) => (part.type === 'file' ? hydrateFilePart(part) : part)))
      ).filter((part) => part != null);

      return { ...message, content };
    })
  );
}
