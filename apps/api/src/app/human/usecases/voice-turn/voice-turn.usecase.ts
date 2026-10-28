import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { CacheService, InstrumentUsecase } from '@novu/application-generic';
import {
  HumanInteractionDelivery,
  HumanInteractionEntity,
  HumanInteractionRepository,
  SubscriberRepository,
} from '@novu/dal';
import {
  HumanChannelViaEnum,
  HumanInteractionKindEnum,
  HumanInteractionResponse,
  HumanInteractionStatusEnum,
} from '@novu/shared';
import {
  postAgentLine,
  readVoiceCallHandoff,
  takeUtterances,
  type VoiceCallHandoffStatus,
} from '../../../agents/channels/voice/voice-call-handoff';
import { HumanInteractionSettlementService } from '../../../agents/human-relay/human-interaction-settlement.service';
import type { VoiceTurnResponseDto } from '../../dtos/voice-turn.dto';
import { isKnownHumanContentOption } from '../../services/human-interaction-lifecycle';
import { RecordVoiceCallEnded } from '../record-voice-call-ended/record-voice-call-ended.usecase';
import { VoiceTurnCommand } from './voice-turn.command';

const TURN_WAIT_POLL_INTERVAL_MS = 250;
/** Bounded wait so a single voice_turn stays under proxy timeouts and the MCP 50s ceiling. */
export const VOICE_TURN_MAX_WAIT_SECONDS = 25;

type SettleIntent = {
  answer: string;
  decision?: 'approve' | 'deny';
  optionId?: string;
};

type SettlePlan = SettleIntent & {
  status: HumanInteractionStatusEnum;
  response: HumanInteractionResponse;
};

/**
 * Agent-facing turn handoff for a live voice call. Posts the next spoken line
 * into the Redis rendezvous (optional), waits (bounded) for the person's next
 * utterance, and settles the interaction when the agent hears a commitment.
 */
@Injectable()
export class VoiceTurn {
  constructor(
    private readonly humanInteractionRepository: HumanInteractionRepository,
    private readonly subscriberRepository: SubscriberRepository,
    private readonly cacheService: CacheService,
    private readonly recordVoiceCallEnded: RecordVoiceCallEnded,
    private readonly settlement: HumanInteractionSettlementService
  ) {}

  @InstrumentUsecase()
  async execute(command: VoiceTurnCommand): Promise<VoiceTurnResponseDto> {
    const say = command.say?.trim() || undefined;
    const settleIntent = this.resolveSettleIntent(command);

    const loaded = await this.humanInteractionRepository.findByIdentifier(command.environmentId, command.identifier);
    if (!loaded) {
      throw new NotFoundException(`Interaction ${command.identifier} was not found.`);
    }

    const interaction = await this.recordVoiceCallEnded.expireIfStale(loaded);
    const voiceSubscriberId = voiceSubscriberForTurn(interaction);
    if (!voiceSubscriberId) {
      throw new BadRequestException('Voice turn only applies to a voice call.');
    }

    if (
      interaction.status !== HumanInteractionStatusEnum.PENDING &&
      interaction.status !== HumanInteractionStatusEnum.EXPIRED
    ) {
      if (settleIntent) {
        throw new BadRequestException(
          `Interaction ${command.identifier} is already ${interaction.status}; it cannot be settled again.`
        );
      }

      return {
        status: 'ended',
        interactionStatus: interaction.status,
        endReason: interaction.voiceFailure?.code,
      };
    }

    if (interaction.status === HumanInteractionStatusEnum.EXPIRED) {
      if (!settleIntent || !canRecoverExpiredVoice(interaction)) {
        if (settleIntent) {
          throw new BadRequestException(
            `Interaction ${command.identifier} is already expired; it cannot be settled again.`
          );
        }

        return {
          status: 'ended',
          interactionStatus: interaction.status,
          endReason: interaction.voiceFailure?.code,
        };
      }

      return this.settleWithoutCall(interaction, settleIntent, voiceSubscriberId);
    }

    const delivery = openVoiceDelivery(interaction);
    if (!delivery) {
      if (settleIntent) {
        return this.settleWithoutCall(interaction, settleIntent, voiceSubscriberId);
      }

      return endedResponse(interaction);
    }

    if (settleIntent) {
      return this.settleTurn({
        command,
        interaction,
        delivery,
        say,
        settleIntent,
      });
    }

    return this.listenTurn({
      command,
      interaction,
      delivery,
      say,
      hangup: Boolean(command.hangup),
    });
  }

  private resolveSettleIntent(command: VoiceTurnCommand): SettleIntent | null {
    const wantsSettle = Boolean(command.answer || command.decision || command.optionId);
    if (!wantsSettle) {
      return null;
    }

    const answer = command.answer?.trim();
    if (!answer) {
      throw new BadRequestException("Settling a voice turn needs the person's own words in `answer`.");
    }

    if (command.decision && command.optionId) {
      throw new BadRequestException('Pass either `decision` or `optionId`, not both.');
    }

    return { answer, decision: command.decision, optionId: command.optionId };
  }

  private buildSettlePlan(
    interaction: HumanInteractionEntity,
    partial: SettleIntent,
    respondedBy: string | undefined,
    respondedBySubscriberId: string
  ): SettlePlan {
    const respondedAt = new Date().toISOString();

    switch (interaction.kind) {
      case HumanInteractionKindEnum.ASK: {
        if (partial.decision || partial.optionId) {
          throw new BadRequestException('An `ask` settles with `answer` only — leave `decision` and `optionId` out.');
        }

        return {
          answer: partial.answer,
          status: HumanInteractionStatusEnum.ANSWERED,
          response: {
            type: 'text',
            text: partial.answer,
            respondedBy,
            respondedBySubscriberId,
            respondedAt,
          },
        };
      }
      case HumanInteractionKindEnum.APPROVE: {
        if (!partial.decision) {
          throw new BadRequestException("An `approve` settles with `decision: 'approve' | 'deny'` and `answer`.");
        }
        if (partial.optionId) {
          throw new BadRequestException('An `approve` uses `decision`, not `optionId`.');
        }

        return {
          answer: partial.answer,
          decision: partial.decision,
          status:
            partial.decision === 'approve' ? HumanInteractionStatusEnum.APPROVED : HumanInteractionStatusEnum.DENIED,
          response: {
            type: 'option',
            optionId: partial.decision,
            text: partial.answer,
            respondedBy,
            respondedBySubscriberId,
            respondedAt,
          },
        };
      }
      case HumanInteractionKindEnum.CHOOSE: {
        if (!partial.optionId) {
          throw new BadRequestException('A `choose` settles with `optionId` and `answer`.');
        }
        if (partial.decision) {
          throw new BadRequestException('A `choose` uses `optionId`, not `decision`.');
        }
        if (!isKnownHumanContentOption(interaction.kind, interaction.content, partial.optionId)) {
          throw new BadRequestException(`Unknown option id "${partial.optionId}" for this choose.`);
        }

        return {
          answer: partial.answer,
          optionId: partial.optionId,
          status: HumanInteractionStatusEnum.ANSWERED,
          response: {
            type: 'option',
            optionId: partial.optionId,
            text: partial.answer,
            respondedBy,
            respondedBySubscriberId,
            respondedAt,
          },
        };
      }
      case HumanInteractionKindEnum.TELL:
        throw new BadRequestException('A `tell` has nothing to settle.');
      default: {
        const _exhaustive: never = interaction.kind;

        throw new BadRequestException(`Unsupported interaction kind: ${_exhaustive}`);
      }
    }
  }

  private async settleTurn(params: {
    command: VoiceTurnCommand;
    interaction: HumanInteractionEntity;
    delivery: HumanInteractionDelivery;
    say: string | undefined;
    settleIntent: SettleIntent;
  }): Promise<VoiceTurnResponseDto> {
    const { command, interaction, delivery, say } = params;
    const handoff = await readVoiceCallHandoff(this.cacheService, delivery.platformMessageId);
    const subscriberId = handoff?.subscriberId || delivery.subscriberId;
    const respondedBy = await this.resolveResponderName(command.environmentId, subscriberId);
    const settlePlan = this.buildSettlePlan(interaction, params.settleIntent, respondedBy, subscriberId);

    // An answer always hangs up, including when the agent has no goodbye to speak.
    // A line queued while still dialing is spoken once the bridge promotes the call.
    if (handoff && (handoff.status === 'live' || handoff.status === 'dialing')) {
      await postAgentLine(this.cacheService, delivery.platformMessageId, say ?? '', true);
    }

    const settled = await this.settlement.settle(interaction, settlePlan.status, settlePlan.response);
    if (!settled) {
      const fresh = await this.humanInteractionRepository.findByIdentifier(command.environmentId, command.identifier);

      throw new BadRequestException(
        `Interaction ${command.identifier} is already ${fresh?.status ?? 'settled'}; it cannot be settled again.`
      );
    }

    return {
      status: 'settled',
      interactionStatus: settled.status,
      answer: settlePlan.answer,
      ...(settlePlan.decision ? { decision: settlePlan.decision } : {}),
      ...(settlePlan.optionId ? { optionId: settlePlan.optionId } : {}),
    };
  }

  private async settleWithoutCall(
    interaction: HumanInteractionEntity,
    settleIntent: SettleIntent,
    subscriberId: string
  ): Promise<VoiceTurnResponseDto> {
    const respondedBy = await this.resolveResponderName(interaction._environmentId, subscriberId);
    const settlePlan = this.buildSettlePlan(interaction, settleIntent, respondedBy, subscriberId);

    const settled =
      (await this.settlement.settle(interaction, settlePlan.status, settlePlan.response)) ??
      (await this.settlement.settleExpiredVoice(interaction, settlePlan.status, settlePlan.response));
    if (!settled) {
      throw new BadRequestException(
        `Interaction ${interaction.identifier} is already settled; it cannot be settled again.`
      );
    }

    return {
      status: 'settled',
      interactionStatus: settled.status,
      answer: settlePlan.answer,
      ...(settlePlan.decision ? { decision: settlePlan.decision } : {}),
      ...(settlePlan.optionId ? { optionId: settlePlan.optionId } : {}),
    };
  }

  private async listenTurn(params: {
    command: VoiceTurnCommand;
    interaction: HumanInteractionEntity;
    delivery: HumanInteractionDelivery;
    say: string | undefined;
    hangup: boolean;
  }): Promise<VoiceTurnResponseDto> {
    const { interaction, delivery } = params;
    const deadline = Date.now() + VOICE_TURN_MAX_WAIT_SECONDS * 1000;
    const state = { linePosted: false, sawDialing: false };

    while (Date.now() < deadline) {
      const response = await this.pollListenTurn({ ...params, state });
      if (response) {
        return response;
      }

      const wait = Math.min(TURN_WAIT_POLL_INTERVAL_MS, deadline - Date.now());
      if (wait <= 0) {
        break;
      }
      await sleep(wait);
    }

    return this.listenTimedOut(delivery, interaction, state.sawDialing);
  }

  private async pollListenTurn(params: {
    command: VoiceTurnCommand;
    interaction: HumanInteractionEntity;
    delivery: HumanInteractionDelivery;
    say: string | undefined;
    hangup: boolean;
    state: { linePosted: boolean; sawDialing: boolean };
  }): Promise<VoiceTurnResponseDto | undefined> {
    const { command, interaction, delivery, state } = params;
    const handoff = await readVoiceCallHandoff(this.cacheService, delivery.platformMessageId);
    if (!handoff) {
      return this.currentEndedTurn(command, interaction, delivery.platformMessageId);
    }

    switch (handoff.status) {
      case 'ended':
        return this.currentEndedTurn(command, interaction, delivery.platformMessageId);
      case 'dialing': {
        state.sawDialing = true;
        const queued = await this.ensureLinePosted(delivery.platformMessageId, params.say, params.hangup, state);
        if (queued === 'ended') {
          return this.currentEndedTurn(command, interaction, delivery.platformMessageId);
        }

        return undefined;
      }
      case 'live':
        return this.pollLiveTurn(params);
      default: {
        const _exhaustive: never = handoff.status;

        return _exhaustive;
      }
    }
  }

  private async pollLiveTurn(params: {
    command: VoiceTurnCommand;
    interaction: HumanInteractionEntity;
    delivery: HumanInteractionDelivery;
    say: string | undefined;
    hangup: boolean;
    state: { linePosted: boolean };
  }): Promise<VoiceTurnResponseDto | undefined> {
    const { command, interaction, delivery, say, hangup, state } = params;
    const line = await this.ensureLinePosted(delivery.platformMessageId, say, hangup, state);
    if (line === 'ended') {
      return this.currentEndedTurn(command, interaction, delivery.platformMessageId);
    }

    const taken = await takeUtterances(this.cacheService, delivery.platformMessageId);
    if (!taken) {
      return this.currentEndedTurn(command, interaction, delivery.platformMessageId);
    }

    if (taken.utterances.length === 0) {
      // No new words yet. A hangup keeps waiting so the bridge can finish ending the call.
      return undefined;
    }

    return {
      status: 'utterance',
      utterance: taken.utterances.join('\n'),
      utterances: taken.utterances,
    };
  }

  private async ensureLinePosted(
    platformMessageId: string,
    say: string | undefined,
    hangup: boolean,
    state: { linePosted: boolean }
  ): Promise<'ready' | 'ended'> {
    if (state.linePosted || (!say && !hangup)) {
      return 'ready';
    }

    const posted = await postAgentLine(this.cacheService, platformMessageId, say ?? '', hangup);
    if (!posted) {
      return 'ended';
    }

    state.linePosted = true;

    return 'ready';
  }

  private async currentEndedTurn(
    command: VoiceTurnCommand,
    interaction: HumanInteractionEntity,
    platformMessageId: string
  ): Promise<VoiceTurnResponseDto> {
    const fresh = await this.humanInteractionRepository.findByIdentifier(command.environmentId, command.identifier);
    const source = fresh ?? interaction;
    const endedDelivery = source.deliveries?.find((item) => item.platformMessageId === platformMessageId);

    return endedResponse(source, endedDelivery);
  }

  private async listenTimedOut(
    delivery: HumanInteractionDelivery,
    interaction: HumanInteractionEntity,
    sawDialing: boolean
  ): Promise<VoiceTurnResponseDto> {
    const finalHandoff = await readVoiceCallHandoff(this.cacheService, delivery.platformMessageId);
    if (!finalHandoff || finalHandoff.status === 'ended') {
      return endedResponse(interaction, delivery);
    }

    if (isStillRinging(finalHandoff.status, sawDialing)) {
      return { status: 'ringing' };
    }

    return { status: 'timeout' };
  }

  private async resolveResponderName(environmentId: string, subscriberId: string): Promise<string | undefined> {
    const subscriber = await this.subscriberRepository.findBySubscriberId(environmentId, subscriberId);
    const firstName = subscriber?.firstName?.trim();
    if (firstName) {
      return firstName;
    }

    return subscriberId;
  }
}

/** A voice turn may record a commitment only for a voice call, never for another channel on the same row. */
function voiceSubscriberForTurn(interaction: HumanInteractionEntity): string | undefined {
  const deliveries = interaction.deliveries ?? [];
  if (deliveries.some((delivery) => delivery.platform !== HumanChannelViaEnum.VOICE)) {
    return undefined;
  }

  const voiceDelivery = deliveries.find((delivery) => delivery.platform === HumanChannelViaEnum.VOICE);
  if (voiceDelivery?.subscriberId) {
    return voiceDelivery.subscriberId;
  }

  return interaction.voiceSubscriberIds?.[0];
}

/** Call-end expiry only, and only while the request deadline has not passed. */
function canRecoverExpiredVoice(interaction: HumanInteractionEntity): boolean {
  if (!interaction.expiresAt || interaction.expiresAt < new Date().toISOString()) {
    return false;
  }

  return (interaction.deliveries ?? []).some(
    (delivery) => delivery.platform === HumanChannelViaEnum.VOICE && Boolean(delivery.voiceCallEnded)
  );
}

function isStillRinging(status: VoiceCallHandoffStatus, sawDialing: boolean): boolean {
  return status === 'dialing' || (sawDialing && status !== 'live');
}

function openVoiceDelivery(interaction: HumanInteractionEntity): HumanInteractionDelivery | undefined {
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
