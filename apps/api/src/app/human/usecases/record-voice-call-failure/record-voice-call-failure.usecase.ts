import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { CacheService, PinoLogger } from '@novu/application-generic';
import { HumanInteractionRepository } from '@novu/dal';
import { voiceCallRegistryKey } from '../../../agents/channels/voice/place-voice-call';
import {
  type CallInitiationFailureEvent,
  voiceFailureFromInitiation,
} from '../../../agents/channels/voice/voice-call-failure';
import { HumanInteractionSettlementService } from '../../../agents/human-relay/human-interaction-settlement.service';

interface VoiceCallRegistryEntry {
  environmentId: string;
  organizationId: string;
}

/**
 * ElevenLabs reports busy, no-answer, and carrier failures after the dial has
 * already returned a conversation id. An unknown conversation returns success
 * so a retry storm cannot disable the webhook. A known call whose delivery is
 * not stored yet asks ElevenLabs to retry.
 */
@Injectable()
export class RecordVoiceCallFailure {
  constructor(
    private readonly cacheService: CacheService,
    private readonly humanInteractionRepository: HumanInteractionRepository,
    private readonly settlement: HumanInteractionSettlementService,
    private readonly logger: PinoLogger
  ) {
    this.logger.setContext(this.constructor.name);
  }

  async execute(event: CallInitiationFailureEvent): Promise<void> {
    if (event.type !== 'call_initiation_failure') {
      return;
    }

    const conversationId = event.data?.conversation_id;
    if (!conversationId) {
      this.logger.warn('Voice initiation failure had no conversation id');

      return;
    }

    const entry = await this.readRegistry(conversationId);
    if (!entry) {
      this.logger.warn({ conversationId }, 'Voice initiation failure had no call lookup');

      return;
    }

    const interaction = await this.humanInteractionRepository.findByPlatformMessageId(entry.environmentId, [
      conversationId,
    ]);
    if (!interaction) {
      throw new ServiceUnavailableException('The voice call is not stored yet.');
    }

    const failure = voiceFailureFromInitiation(event);
    const settled = await this.settlement.failVoiceCall(interaction, failure, conversationId);
    if (!settled) {
      this.logger.warn({ conversationId, interactionId: interaction.identifier }, 'Voice call was no longer pending');
    }
  }

  private async readRegistry(conversationId: string): Promise<VoiceCallRegistryEntry | null> {
    const raw = await this.cacheService.get(voiceCallRegistryKey(conversationId));
    if (!raw) {
      return null;
    }

    try {
      const parsed = JSON.parse(raw) as VoiceCallRegistryEntry;
      if (!parsed.environmentId || !parsed.organizationId) {
        return null;
      }

      return parsed;
    } catch {
      return null;
    }
  }
}
