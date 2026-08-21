import { Injectable } from '@nestjs/common';
import { CacheService, PinoLogger } from '@novu/application-generic';
import { AgentConversationService } from '../conversation-runtime/conversation/agent-conversation.service';

const ACTION_ACCEPT_TTL_SECONDS = 60 * 60 * 24;

@Injectable()
export class AgentChatAcceptIdempotencyService {
  constructor(
    private readonly conversationService: AgentConversationService,
    private readonly cacheService: CacheService,
    private readonly logger: PinoLogger
  ) {
    this.logger.setContext(this.constructor.name);
  }

  async hasAcceptedMessage(environmentId: string, messageId: string): Promise<boolean> {
    const existing = await this.conversationService.findActivityByIdentifier(environmentId, messageId);

    return existing != null;
  }

  async hasAcceptedAction(environmentId: string, idempotencyKey: string): Promise<boolean> {
    const cacheKey = this.actionCacheKey(environmentId, idempotencyKey);
    const cached = await this.cacheService.get(cacheKey);

    return cached != null;
  }

  async rememberAcceptedAction(environmentId: string, idempotencyKey: string): Promise<void> {
    const cacheKey = this.actionCacheKey(environmentId, idempotencyKey);
    await this.cacheService.set(cacheKey, '1', ACTION_ACCEPT_TTL_SECONDS);
  }

  private actionCacheKey(environmentId: string, idempotencyKey: string): string {
    return `agent-chat:action-accept:${environmentId}:${idempotencyKey}`;
  }
}
