import type { AgentFileRef, AgentMessageContent } from './event-protocol.js';
import type { ReplyContent, ReplyFileRef } from './types.js';

export function toAgentMessageContent(reply: ReplyContent): AgentMessageContent {
  if (reply.markdown !== undefined) {
    return { markdown: reply.markdown };
  }

  if (reply.card !== undefined) {
    return { card: reply.card };
  }

  throw new Error('Invalid reply content — expected markdown or card');
}

export function toAgentFileRefs(files?: ReplyFileRef[]): AgentFileRef[] | undefined {
  if (!files?.length) {
    return undefined;
  }

  return files.map((file, index) => ({
    fileId: file.filename || `file_${index}`,
    name: file.filename,
    mediaType: file.mimeType,
    ...(file.data !== undefined ? { data: file.data } : {}),
    ...(file.url !== undefined ? { url: file.url } : {}),
  }));
}
