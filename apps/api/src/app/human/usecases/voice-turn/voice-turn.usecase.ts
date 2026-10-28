import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { CacheService, InstrumentUsecase } from '@novu/application-generic';
import { HumanInteractionDelivery, HumanInteractionEntity, HumanInteractionRepository } from '@novu/dal';
import { HumanChannelViaEnum, HumanInteractionStatusEnum } from '@novu/shared';
import { postAgentLine, readVoiceCallHandoff } from '../../../agents/channels/voice/voice-call-handoff';
import { HUMAN_INBOX_MAX_WAIT_SECONDS } from '../../dtos/human-inbox.dto';
import type { VoiceTurnResponseDto } from '../../dtos/voice-turn.dto';
import { RecordVoiceCallEnded } from '../record-voice-call-ended/record-voice-call-ended.usecase';
import { VoiceTurnCommand } from './voice-turn.command';

const TURN_WAIT_POLL_INTERVAL_MS = 250;
const TURN_MAX_WAIT_SECONDS = HUMAN_INBOX_MAX_WAIT_SECONDS;

/**
 * Minimal agent-facing turn handoff for NV-9171 testing. Posts the next spoken
 * line into the Redis rendezvous and waits (bounded) for the person's next
 * utterance. Settle / structured answer land in NV-9172.
 */
@Injectable()
export class VoiceTurn {
  constructor(
    private readonly humanInteractionRepository: HumanInteractionRepository,
    private readonly cacheService: CacheService,
    private readonly recordVoiceCallEnded: RecordVoiceCallEnded
  ) {}

  @InstrumentUsecase()
  async execute(command: VoiceTurnCommand): Promise<VoiceTurnResponseDto> {
    const line = command.line.trim();
    if (!line) {
      throw new BadRequestException('A voice turn needs a non-empty line.');
    }

    const loaded = await this.humanInteractionRepository.findByIdentifier(command.environmentId, command.identifier);
    if (!loaded) {
      throw new NotFoundException(`Interaction ${command.identifier} was not found.`);
    }

    const interaction = await this.recordVoiceCallEnded.expireIfStale(loaded);
    if (interaction.status !== HumanInteractionStatusEnum.PENDING) {
      return {
        status: 'ended',
        interactionStatus: interaction.status,
        endReason: interaction.voiceFailure?.code,
      };
    }

    const delivery = liveVoiceDelivery(interaction);
    if (!delivery) {
      return endedResponse(interaction);
    }

    const handoff = await readVoiceCallHandoff(this.cacheService, delivery.platformMessageId);
    if (!handoff || handoff.status !== 'live') {
      return endedResponse(interaction, delivery);
    }

    const inboundBefore = handoff.inboundSeq;
    const posted = await postAgentLine(this.cacheService, delivery.platformMessageId, line, Boolean(command.hangup));
    if (!posted) {
      return endedResponse(interaction, delivery);
    }

    const deadline = Date.now() + TURN_MAX_WAIT_SECONDS * 1000;
    while (Date.now() < deadline) {
      const current = await readVoiceCallHandoff(this.cacheService, delivery.platformMessageId);
      if (!current || current.status !== 'live') {
        const fresh = await this.humanInteractionRepository.findByIdentifier(command.environmentId, command.identifier);
        const endedDelivery = (fresh ?? interaction).deliveries?.find(
          (item) => item.platformMessageId === delivery.platformMessageId
        );

        return endedResponse(fresh ?? interaction, endedDelivery);
      }

      if (current.inboundSeq > inboundBefore) {
        const utterances = current.utterances.slice(inboundBefore);
        if (utterances.length > 0) {
          return { status: 'utterance', utterance: utterances.join('\n'), utterances };
        }
      }

      const wait = Math.min(TURN_WAIT_POLL_INTERVAL_MS, deadline - Date.now());
      if (wait <= 0) {
        break;
      }

      await sleep(wait);
    }

    return { status: 'timeout' };
  }
}

function liveVoiceDelivery(interaction: HumanInteractionEntity): HumanInteractionDelivery | undefined {
  return (interaction.deliveries ?? []).find(
    (delivery) => delivery.platform === HumanChannelViaEnum.VOICE && !delivery.voiceFailure && !delivery.voiceCallEnded
  );
}

function endedResponse(interaction: HumanInteractionEntity, delivery?: HumanInteractionDelivery): VoiceTurnResponseDto {
  return {
    status: 'ended',
    interactionStatus: interaction.status,
    endReason: delivery?.voiceCallEnded?.reason ?? 'call_ended',
  };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
