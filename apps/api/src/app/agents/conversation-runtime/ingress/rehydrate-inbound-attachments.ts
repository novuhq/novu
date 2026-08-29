import type { Adapter, Attachment, Message } from 'chat';

interface AttachmentRehydratingAdapter extends Adapter {
  rehydrateAttachment: (attachment: Attachment) => Attachment;
}

function isAttachmentRehydratingAdapter(adapter: Adapter): adapter is AttachmentRehydratingAdapter {
  return typeof (adapter as AttachmentRehydratingAdapter).rehydrateAttachment === 'function';
}

/**
 * Chat SDK state (Redis) serializes messages via `Message.toJSON()`, which keeps
 * attachment URLs / `fetchMetadata` but drops `fetchData`. Slack (and other
 * adapters that download with a bot token) restore that closure through
 * `rehydrateAttachment`. Call this before `storeInbound` so the current turn
 * can actually fetch bytes.
 */
export function rehydrateInboundAttachments(adapter: Adapter | undefined, message: Message): void {
  if (!adapter || !message.attachments?.length || !isAttachmentRehydratingAdapter(adapter)) {
    return;
  }

  message.attachments = message.attachments.map((attachment) => adapter.rehydrateAttachment(attachment));
}
