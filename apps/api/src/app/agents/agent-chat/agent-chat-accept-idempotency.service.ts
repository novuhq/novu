import { Injectable } from '@nestjs/common';
import { CacheService, PinoLogger } from '@novu/application-generic';
import { AgentConversationService } from '../conversation-runtime/conversation/agent-conversation.service';

/** In-flight lock only. Durable activity rows are the success ledger. */
const ACCEPT_LOCK_TTL_SECONDS = 60 * 5;

export type AgentChatInboundClaimResult = {
  /** When false, return the ack without dispatching again. */
  claimed: boolean;
  conversationId: string;
};

@Injectable()
export class AgentChatAcceptIdempotencyService {
  constructor(
    private readonly conversationService: AgentConversationService,
    private readonly cacheService: CacheService,
    private readonly logger: PinoLogger
  ) {
    this.logger.setContext(this.constructor.name);
  }

  async claimInboundMessage(
    environmentId: string,
    messageId: string,
    conversationId: string
  ): Promise<AgentChatInboundClaimResult> {
    return this.claimAccept(this.messageCacheKey(environmentId, messageId), conversationId, () =>
      this.findMessageConversationId(environmentId, messageId)
    );
  }

  async claimInboundAction(
    environmentId: string,
    idempotencyKey: string,
    conversationId: string
  ): Promise<AgentChatInboundClaimResult> {
    return this.claimAccept(this.actionCacheKey(environmentId, idempotencyKey), conversationId);
  }

  async releaseInboundMessage(environmentId: string, messageId: string): Promise<void> {
    await this.cacheService.del(this.messageCacheKey(environmentId, messageId));
  }

  async releaseInboundAction(environmentId: string, idempotencyKey: string): Promise<void> {
    await this.cacheService.del(this.actionCacheKey(environmentId, idempotencyKey));
  }

  private async claimAccept(
    cacheKey: string,
    conversationId: string,
    resolveDurable?: () => Promise<string | null>
  ): Promise<AgentChatInboundClaimResult> {
    if (resolveDurable) {
      const durableConversationId = await resolveDurable();
      if (durableConversationId) {
        return { claimed: false, conversationId: durableConversationId };
      }
    }

    const reserved = await this.cacheService.setIfNotExist(cacheKey, conversationId, {
      ttl: ACCEPT_LOCK_TTL_SECONDS,
    });
    if (reserved === 'OK') {
      return { claimed: true, conversationId };
    }

    if (resolveDurable) {
      const durableRetry = await resolveDurable();
      if (durableRetry) {
        return { claimed: false, conversationId: durableRetry };
      }
    }

    const cachedConversationId = await this.cacheService.get(cacheKey);
    if (cachedConversationId) {
      return { claimed: false, conversationId: cachedConversationId };
    }

    return { claimed: true, conversationId };
  }

  private async findMessageConversationId(environmentId: string, messageId: string): Promise<string | null> {
    const activity = await this.conversationService.findActivityByIdentifier(environmentId, messageId);
    if (!activity?.platformThreadId) {
      return null;
    }

    return this.conversationIdFromPlatformThreadId(activity.platformThreadId);
  }

  private conversationIdFromPlatformThreadId(platformThreadId: string): string {
    const prefix = 'agent_chat:';

    return platformThreadId.startsWith(prefix) ? platformThreadId.slice(prefix.length) : platformThreadId;
  }

  private messageCacheKey(environmentId: string, messageId: string): string {
    return `agent-chat:message-accept:${environmentId}:${messageId}`;
  }

  private actionCacheKey(environmentId: string, idempotencyKey: string): string {
    return `agent-chat:action-accept:${environmentId}:${idempotencyKey}`;
  }
}
