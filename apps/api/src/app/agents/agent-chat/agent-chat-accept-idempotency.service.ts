import { Injectable } from '@nestjs/common';
import { CacheService } from '@novu/application-generic';
import { type AgentChatInboundClaimResult, conversationIdFromThreadId } from '@novu/chat-adapter-agent-chat';
import { AgentConversationService } from '../conversation-runtime/conversation/agent-conversation.service';

/** In-flight lock only. Durable activity rows are the success ledger. */
const ACCEPT_LOCK_TTL_SECONDS = 60 * 5;

@Injectable()
export class AgentChatAcceptIdempotencyService {
  constructor(
    private readonly conversationService: AgentConversationService,
    private readonly cacheService: CacheService
  ) {}

  async claimInbound(environmentId: string, key: string, conversationId: string): Promise<AgentChatInboundClaimResult> {
    const durableConversationId = await this.findDurableConversationId(environmentId, key);
    if (durableConversationId) {
      return { claimed: false, conversationId: durableConversationId };
    }

    const cacheKey = this.cacheKey(environmentId, key);
    const reserved = await this.cacheService.setIfNotExist(cacheKey, conversationId, {
      ttl: ACCEPT_LOCK_TTL_SECONDS,
    });
    if (reserved === 'OK') {
      return { claimed: true, conversationId };
    }

    const durableRetry = await this.findDurableConversationId(environmentId, key);
    if (durableRetry) {
      return { claimed: false, conversationId: durableRetry };
    }

    const cachedConversationId = await this.cacheService.get(cacheKey);
    if (cachedConversationId) {
      return { claimed: false, conversationId: cachedConversationId };
    }

    return { claimed: false, conversationId };
  }

  async releaseInbound(environmentId: string, key: string): Promise<void> {
    await this.cacheService.del(this.cacheKey(environmentId, key));
  }

  private async findDurableConversationId(environmentId: string, identifier: string): Promise<string | null> {
    const activity = await this.conversationService.findActivityByIdentifier(environmentId, identifier);
    if (!activity?.platformThreadId) {
      return null;
    }

    return conversationIdFromThreadId(activity.platformThreadId);
  }

  private cacheKey(environmentId: string, key: string): string {
    return `agent-chat:accept:${environmentId}:${key}`;
  }
}
