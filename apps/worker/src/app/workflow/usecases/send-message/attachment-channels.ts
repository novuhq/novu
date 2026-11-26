import { ChannelTypeEnum } from '@novu/shared';
import { IChatFile, IChatFileDeliveryResult } from '@novu/stateless';

/**
 * A trigger `payload.attachments` entry after the worker loaded its bytes from storage.
 * `file` is `null` when the stored file could not be found.
 */
export type LoadedTriggerAttachment = {
  file?: Buffer | null;
  name?: string;
  mime?: string;
  channels?: unknown;
};

function listedChannels(attachment: LoadedTriggerAttachment): string[] | undefined {
  const { channels } = attachment ?? {};

  return Array.isArray(channels) && channels.length > 0 ? (channels as string[]) : undefined;
}

/**
 * Email keeps every attachment that does not name its channels, as it always has.
 * An attachment that names its channels is emailed only when the list includes `email`.
 */
export function isEmailAttachment(attachment: LoadedTriggerAttachment): boolean {
  const channels = listedChannels(attachment);

  return !channels || channels.includes(ChannelTypeEnum.EMAIL);
}

/**
 * Chat steps send an attachment only when its `channels` list includes `chat`, so files meant for
 * one person's email never reach a shared Slack or Teams channel by default.
 */
export function isChatAttachment(attachment: LoadedTriggerAttachment): boolean {
  return listedChannels(attachment)?.includes(ChannelTypeEnum.CHAT) ?? false;
}

export type ChatAttachments = {
  files: IChatFile[];
  /** Attachments marked for chat whose bytes could not be loaded; reported, never sent. */
  unavailable: IChatFileDeliveryResult[];
};

export function getChatAttachments(payload: Record<string, unknown> | undefined): ChatAttachments {
  const attachments = Array.isArray(payload?.attachments) ? (payload.attachments as LoadedTriggerAttachment[]) : [];
  const result: ChatAttachments = { files: [], unavailable: [] };

  for (const [index, attachment] of attachments.entries()) {
    if (!isChatAttachment(attachment)) {
      continue;
    }

    const name = attachment.name || `attachment-${index + 1}`;

    if (!Buffer.isBuffer(attachment.file)) {
      result.unavailable.push({
        name,
        status: 'failed',
        reason: "The file couldn't be loaded from Novu's storage.",
      });
      continue;
    }

    result.files.push({
      name,
      mime: attachment.mime || 'application/octet-stream',
      file: attachment.file,
    });
  }

  return result;
}
