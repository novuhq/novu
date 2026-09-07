import { Injectable } from '@nestjs/common';
import { ConversationActivityRepository, ConversationRepository } from '@novu/dal';

export type MintEventSequenceRequest = {
  environmentId: string;
  organizationId: string;
  conversationId: string;
};

/**
 * Allocates monotonic per-conversation event sequence numbers. Channel-agnostic:
 * live delivery paths mint before emitting, durable persist paths mint when no
 * value was supplied. Ephemeral events (typing) consume numbers that never
 * appear in durable history — gaps are expected.
 */
@Injectable()
export class ConversationEventSequenceService {
  constructor(
    private readonly conversationRepository: ConversationRepository,
    private readonly activityRepository: ConversationActivityRepository
  ) {}

  async mint(request: MintEventSequenceRequest): Promise<number> {
    const conversation = await this.conversationRepository.findOne(
      {
        _id: request.conversationId,
        _environmentId: request.environmentId,
        _organizationId: request.organizationId,
      },
      ['eventSequence']
    );
    const currentSequence = conversation?.eventSequence ?? 0;
    // Legacy bootstrap: conversations that predate sequencing already have
    // rows that readers number virtually by position, so the first allocated
    // sequence must land above them. Counting all rows over-approximates
    // safely (extra gap, never a collision).
    const minimum =
      currentSequence > 0
        ? 0
        : await this.activityRepository.countActivities(
            request.environmentId,
            request.organizationId,
            request.conversationId
          );

    return this.conversationRepository.allocateEventSequence(
      request.environmentId,
      request.organizationId,
      request.conversationId,
      minimum
    );
  }
}
