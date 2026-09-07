import { randomUUID } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { CacheService } from '@novu/application-generic';
import { type WebChatInboundClaimResult, conversationIdFromThreadId } from '@novu/chat-adapter-web-chat';
import { AgentConversationService } from '../conversation-runtime/conversation/agent-conversation.service';

/** In-flight lock only. Durable activity rows + success cache cover replays. */
const ACCEPT_LOCK_TTL_SECONDS = 60 * 5;
const ACCEPT_SUCCESS_TTL_SECONDS = 60 * 60 * 24;
const LOCK_VALUE_SEPARATOR = '\t';
const COMPARE_AND_DELETE_SCRIPT = `
if redis.call("GET", KEYS[1]) == ARGV[1] then
  return redis.call("DEL", KEYS[1])
end
return 0
`;

@Injectable()
export class WebChatAcceptIdempotencyService {
  constructor(
    private readonly conversationService: AgentConversationService,
    private readonly cacheService: CacheService
  ) {}

  async claimInbound(environmentId: string, key: string, conversationId: string): Promise<WebChatInboundClaimResult> {
    const durableConversationId = await this.findDurableConversationId(environmentId, key);
    if (durableConversationId) {
      return { outcome: 'duplicate', conversationId: durableConversationId, messageId: this.messageIdFromKey(key) };
    }

    const successCache = await this.findSuccessCache(environmentId, key);
    if (successCache) {
      return { outcome: 'duplicate', conversationId: successCache.conversationId, messageId: successCache.messageId };
    }

    const cacheKey = this.cacheKey(environmentId, key);
    const claimToken = randomUUID();
    const lockValue = this.encodeLockValue(conversationId, claimToken);
    const reserved = await this.cacheService.setIfNotExist(cacheKey, lockValue, {
      ttl: ACCEPT_LOCK_TTL_SECONDS,
    });
    if (reserved === 'OK') {
      return { outcome: 'acquired', conversationId, claimToken };
    }

    const durableRetry = await this.findDurableConversationId(environmentId, key);
    if (durableRetry) {
      return { outcome: 'duplicate', conversationId: durableRetry, messageId: this.messageIdFromKey(key) };
    }

    const successRetry = await this.findSuccessCache(environmentId, key);
    if (successRetry) {
      return { outcome: 'duplicate', conversationId: successRetry.conversationId, messageId: successRetry.messageId };
    }

    const cachedLock = await this.cacheService.get(cacheKey);
    const cachedConversationId = this.conversationIdFromLockValue(cachedLock);
    if (cachedConversationId) {
      return { outcome: 'in_progress', conversationId: cachedConversationId };
    }

    return { outcome: 'unavailable' };
  }

  async releaseInbound(environmentId: string, key: string, conversationId: string, claimToken: string): Promise<void> {
    await this.cacheService.eval(
      COMPARE_AND_DELETE_SCRIPT,
      [this.cacheKey(environmentId, key)],
      [this.encodeLockValue(conversationId, claimToken)]
    );
  }

  async completeInbound(
    environmentId: string,
    key: string,
    conversationId: string,
    claimToken: string,
    messageId?: string
  ): Promise<void> {
    const payload = JSON.stringify({
      conversationId,
      ...(messageId ? { messageId } : {}),
    });
    await this.cacheService.set(this.successCacheKey(environmentId, key), payload, {
      ttl: ACCEPT_SUCCESS_TTL_SECONDS,
    });
    await this.releaseInbound(environmentId, key, conversationId, claimToken);
  }

  private async findDurableConversationId(environmentId: string, identifier: string): Promise<string | null> {
    const activity = await this.conversationService.findActivityByIdentifier(environmentId, identifier);
    if (!activity?.platformThreadId) {
      return null;
    }

    return conversationIdFromThreadId(activity.platformThreadId);
  }

  private cacheKey(environmentId: string, key: string): string {
    return `web-chat:accept:${environmentId}:${key}`;
  }

  private successCacheKey(environmentId: string, key: string): string {
    return `web-chat:accept-success:${environmentId}:${key}`;
  }

  private async findSuccessCache(
    environmentId: string,
    key: string
  ): Promise<{ conversationId: string; messageId?: string } | null> {
    const cached = await this.cacheService.get(this.successCacheKey(environmentId, key));
    if (!cached) {
      return null;
    }

    try {
      const parsed = JSON.parse(String(cached)) as { conversationId?: string; messageId?: string };
      if (!parsed.conversationId) {
        return null;
      }

      return {
        conversationId: parsed.conversationId,
        messageId: parsed.messageId ?? this.messageIdFromKey(key),
      };
    } catch {
      return null;
    }
  }

  private messageIdFromKey(key: string): string | undefined {
    return key.startsWith('msg_') ? key : undefined;
  }

  private encodeLockValue(conversationId: string, claimToken: string): string {
    return `${conversationId}${LOCK_VALUE_SEPARATOR}${claimToken}`;
  }

  private conversationIdFromLockValue(lockValue: string | null | undefined): string | null {
    if (!lockValue) {
      return null;
    }

    const separatorIndex = lockValue.indexOf(LOCK_VALUE_SEPARATOR);
    if (separatorIndex <= 0) {
      return lockValue;
    }

    return lockValue.slice(0, separatorIndex);
  }
}
