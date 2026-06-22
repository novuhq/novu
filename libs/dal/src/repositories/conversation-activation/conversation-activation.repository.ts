import { Injectable } from '@nestjs/common';
import { EnforceEnvOrOrgIds } from '../../types';
import { BaseRepositoryV2 } from '../base-repository-v2';
import {
  ConversationActivationDBModel,
  ConversationActivationEntity,
  ConversationActivationReasonEnum,
  ConversationThreadKindEnum,
} from './conversation-activation.entity';
import { ConversationActivation } from './conversation-activation.schema';

@Injectable()
export class ConversationActivationRepository extends BaseRepositoryV2<
  ConversationActivationDBModel,
  ConversationActivationEntity,
  EnforceEnvOrOrgIds
> {
  constructor() {
    super(ConversationActivation, ConversationActivationEntity);
  }

  async recordActivation(params: {
    environmentId: string;
    organizationId: string;
    conversationId: string;
    agentId: string;
    platform: string;
    threadKind: ConversationThreadKindEnum;
    reason: ConversationActivationReasonEnum;
    periodKey: string;
  }): Promise<void> {
    await this.create({
      _conversationId: params.conversationId,
      _agentId: params.agentId,
      platform: params.platform,
      threadKind: params.threadKind,
      reason: params.reason,
      periodKey: params.periodKey,
      _environmentId: params.environmentId,
      _organizationId: params.organizationId,
    });
  }

  /**
   * Counts active conversations for an organization in a billing period.
   * Pass `limit` (e.g. `planLimit + 1`) so the count short-circuits instead of
   * scanning the entire period when only "at/over limit" matters.
   */
  async countForOrganizationPeriod(organizationId: string, periodKey: string, limit?: number): Promise<number> {
    return this.count({ _organizationId: organizationId, periodKey }, limit);
  }
}
