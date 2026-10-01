import { type BaseMessage, HumanMessage, isHumanMessage } from '@langchain/core/messages';
import { fetchUnreachableAttachmentBase64, isProviderFetchableUrl } from '../../resources/agent/attachment-url';

export { isProviderFetchableUrl };

type HumanContentBlocks = Exclude<HumanMessage['content'], string>;
type HumanContentPart = HumanContentBlocks[number];

type MediaPart = {
  type?: string;
  url?: string;
  data?: unknown;
  [key: string]: unknown;
};

async function hydratePart(part: HumanContentPart): Promise<HumanContentPart | null> {
  if (!part || typeof part !== 'object') {
    return part;
  }

  const media = part as MediaPart;
  if ((media.type !== 'image' && media.type !== 'file') || typeof media.url !== 'string') {
    return part;
  }

  if (isProviderFetchableUrl(media.url)) {
    return part;
  }

  const data = await fetchUnreachableAttachmentBase64(media.url);
  if (!data) {
    return null;
  }

  const { url: _url, ...rest } = media;

  return { ...rest, data } as HumanContentPart;
}

/**
 * Replace attachment URLs a hosted model cannot fetch with inline base64.
 * HTTPS public URLs are left as-is so production signed S3 links stay URL-based.
 * Over-budget downloads are omitted so one large file cannot abort the turn.
 *
 * Novu calls this automatically when you return a `LangChainAgentConfig`.
 * Call it yourself before `createAgent().invoke(...)` when you map history.
 */
export async function hydrateUnreachableAttachmentUrls(messages: BaseMessage[]): Promise<BaseMessage[]> {
  return Promise.all(
    messages.map(async (message) => {
      if (!isHumanMessage(message) || !Array.isArray(message.content)) {
        return message;
      }

      const content = (await Promise.all(message.content.map((part) => hydratePart(part)))).filter(
        (part): part is HumanContentPart => part != null
      );

      return new HumanMessage({ content });
    })
  );
}
