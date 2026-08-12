import { Injectable } from '@nestjs/common';
import {
  ActivityView,
  ConversationActivityEntity,
  ConversationActivityRepository,
  isDuplicateKeyError,
} from '@novu/dal';
import { AGENT_HISTORY_LIMIT } from './agent-conversation.service';
import { ConversationEventSequenceService } from './conversation-event-sequence.service';
import {
  describeRunLifecycleFromEvent,
  type PersistRunLifecycleParams,
  runLifecycleIdentifier,
} from './run-lifecycle-activity';

export interface ListActivityViewParams {
  view: ActivityView;
  environmentId: string;
  organizationId: string;
  conversationId: string;
  limit?: number;
  before?: string;
}

@Injectable()
export class ConversationActivityLedger {
  constructor(
    private readonly activityRepository: ConversationActivityRepository,
    private readonly eventSequenceService: ConversationEventSequenceService
  ) {}

  async listForView(params: ListActivityViewParams): Promise<{ data: ConversationActivityEntity[]; hasMore: boolean }> {
    return this.activityRepository.listForView({
      view: params.view,
      environmentId: params.environmentId,
      organizationId: params.organizationId,
      conversationId: params.conversationId,
      limit: params.limit ?? AGENT_HISTORY_LIMIT,
      before: params.before,
    });
  }

  /**
   * Persist a protocol operational event (run lifecycle today). Returns `null` when the same
   * event was already persisted, so callers can publish exactly once per event.
   */
  async persistProtocolEvent(params: PersistRunLifecycleParams): Promise<ConversationActivityEntity | null> {
    const { type, content, richContent, identifierSuffix } = describeRunLifecycleFromEvent(params.event);
    const identifier = runLifecycleIdentifier(params.runId, identifierSuffix);
    const sequence = await this.eventSequenceService.mint({
      environmentId: params.environmentId,
      organizationId: params.organizationId,
      conversationId: params.conversationId,
    });

    try {
      return await this.activityRepository.createRunActivity({
        identifier,
        conversationId: params.conversationId,
        platform: params.channel.platform,
        integrationId: params.channel._integrationId,
        platformThreadId: params.channel.platformThreadId,
        senderId: params.agentIdentifier,
        content,
        type,
        richContent,
        sequence,
        environmentId: params.environmentId,
        organizationId: params.organizationId,
      });
    } catch (err) {
      if (isDuplicateKeyError(err)) {
        return null;
      }

      throw err;
    }
  }
}
