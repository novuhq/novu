import { Injectable } from '@nestjs/common';
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
 * already returned a conversation id. A missing lookup still returns success
 * so a retry storm cannot disable the webhook.
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

    const interaction = await this.humanInteractionRepository.findPendingByPlatformMessageId(entry.environmentId, [
      conversationId,
    ]);
    if (!interaction) {
      this.logger.warn(
        { conversationId, environmentId: entry.environmentId },
        'Voice initiation failure matched no pending call'
      );

      return;
    }

    const failure = voiceFailureFromInitiation(event);
    const settled = await this.settlement.failVoiceCall(interaction, failure);
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
