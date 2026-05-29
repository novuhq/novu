import { BadRequestException, Injectable } from '@nestjs/common';
import type { AdapterPostableMessage, EmojiValue } from 'chat';
import { AgentConfigResolver } from '../../channels/agent-config-resolver.service';
import { esmImport } from '../../shared/util/esm-import';
import type { ChatSdkReplyContent } from '../egress/file-materializer.service';
import { FileMaterializer } from '../egress/file-materializer.service';
import { ChatInstanceRegistry } from '../ingress/chat-instance.registry';
import type { Channel, ChannelMessage, ChannelReceipt, ChannelTarget } from '../ports/channel.port';

function toDeliveryError(err: unknown): never {
  const base = err instanceof Error ? err.message : String(err);

  throw new BadRequestException({
    error: 'delivery_failed',
    message: base,
  });
}

export class ChatChannel implements Channel {
  readonly kind = 'chat' as const;

  constructor(
    private readonly target: ChannelTarget,
    private readonly registry: ChatInstanceRegistry,
    private readonly agentConfigResolver: AgentConfigResolver,
    private readonly fileMaterializer: FileMaterializer
  ) {}

  async post(msg: ChannelMessage): Promise<ChannelReceipt> {
    const { chat, config } = await this.resolveInstance();
    const thread = chat.thread(this.target.platformThreadId);
    const deliveryContent = await this.fileMaterializer.prepareContentForDelivery(
      msg,
      this.target.platform,
      this.target.agentId
    );
    const postArg = this.buildPostableMessage(deliveryContent);
    const sent = await thread.post(postArg).catch(toDeliveryError);

    return { messageId: sent.id, platformThreadId: sent.threadId };
  }

  async edit(messageId: string, msg: ChannelMessage): Promise<ChannelReceipt> {
    const { chat, config } = await this.resolveInstance();
    const adapter = chat.getAdapter(this.target.platform);
    if (typeof adapter.editMessage !== 'function') {
      throw new BadRequestException(`Platform ${this.target.platform} does not support editing messages`);
    }

    const deliveryContent = await this.fileMaterializer.prepareContentForDelivery(
      msg,
      this.target.platform,
      this.target.agentId
    );
    const editPayload = this.buildPostableMessage(deliveryContent);

    let editPromise: Promise<{ id: string; threadId: string }>;
    if (deliveryContent.card) {
      editPromise = adapter.editMessage(
        this.target.platformThreadId,
        messageId,
        deliveryContent.card as unknown as AdapterPostableMessage
      );
    } else {
      editPromise = adapter.editMessage(this.target.platformThreadId, messageId, editPayload);
    }

    const edited = await editPromise.catch(toDeliveryError);

    return { messageId: edited.id, platformThreadId: edited.threadId };
  }

  async sendDirect(subscriberId: string, msg: ChannelMessage): Promise<ChannelReceipt> {
    const { chat, config } = await this.resolveInstance();
    const dmThread = await chat.openDM(subscriberId);
    const deliveryContent = await this.fileMaterializer.prepareContentForDelivery(
      msg,
      config.platform,
      this.target.agentId
    );
    const postArg = this.buildPostableMessage(deliveryContent);
    const sent = await dmThread.post(postArg).catch(toDeliveryError);
    const platformThreadId = sent.threadId.endsWith(':') ? `${sent.threadId}${sent.id}` : sent.threadId;

    return { messageId: sent.id, platformThreadId };
  }

  async startTyping(): Promise<void> {
    const { chat } = await this.resolveInstance();
    const thread = chat.thread(this.target.platformThreadId);
    if (typeof thread.startTyping !== 'function') {
      return;
    }

    await thread.startTyping('Thinking...').catch(toDeliveryError);
  }

  async react(messageId: string, emoji: string): Promise<void> {
    const { chat } = await this.resolveInstance();
    const adapter = chat.getAdapter(this.target.platform);
    const resolved = await this.resolveEmoji(emoji);
    await adapter.addReaction(this.target.platformThreadId, messageId, resolved);
  }

  async removeReaction(messageId: string, emoji: string): Promise<void> {
    const { chat } = await this.resolveInstance();
    const adapter = chat.getAdapter(this.target.platform);
    const resolved = await this.resolveEmoji(emoji);
    await adapter.removeReaction(this.target.platformThreadId, messageId, resolved);
  }

  private async resolveInstance() {
    const config = await this.agentConfigResolver.resolve(this.target.agentId, this.target.integrationIdentifier);
    const instanceKey = `${this.target.agentId}:${this.target.integrationIdentifier}`;
    const chat = await this.registry.getOrCreate(instanceKey, this.target.agentId, config.platform, config);

    return { chat, config };
  }

  private async resolveEmoji(name: string): Promise<EmojiValue> {
    const { getEmoji } = await esmImport('chat');
    const resolved = getEmoji(name);
    if (!resolved) {
      throw new Error(`Unknown emoji name: "${name}". Use GET /agents/emoji to list supported options.`);
    }

    return resolved;
  }

  private buildPostableMessage(deliveryContent: ChatSdkReplyContent): AdapterPostableMessage {
    if (deliveryContent.card) {
      const payload: { card: unknown; files?: unknown[] } = { card: deliveryContent.card };
      if (deliveryContent.files?.length) {
        payload.files = deliveryContent.files;
      }

      return payload as unknown as AdapterPostableMessage;
    }

    return {
      markdown: deliveryContent.markdown ?? '',
      files: deliveryContent.files,
    } as unknown as AdapterPostableMessage;
  }
}

@Injectable()
export class ChatChannelFactory {
  constructor(
    private readonly registry: ChatInstanceRegistry,
    private readonly agentConfigResolver: AgentConfigResolver,
    private readonly fileMaterializer: FileMaterializer
  ) {}

  create(target: ChannelTarget): ChatChannel {
    return new ChatChannel(target, this.registry, this.agentConfigResolver, this.fileMaterializer);
  }
}
