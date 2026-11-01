import { Injectable, NotFoundException } from '@nestjs/common';
import { InstrumentUsecase } from '@novu/application-generic';
import { HumanInteractionRepository } from '@novu/dal';
import { HumanChannelViaEnum } from '@novu/shared';
import { type ElevenLabsRecording, requireRecording } from '../../../agents/channels/voice/elevenlabs-conversations';
import { GetVoiceRecordingCommand } from './get-voice-recording.command';

/**
 * Proxies the ElevenLabs call recording behind our own authorization, so no
 * ElevenLabs key reaches the browser.
 */
@Injectable()
export class GetVoiceRecording {
  constructor(private readonly humanInteractionRepository: HumanInteractionRepository) {}

  @InstrumentUsecase()
  async execute(command: GetVoiceRecordingCommand): Promise<ElevenLabsRecording> {
    const interaction = await this.humanInteractionRepository.findByIdentifier(
      command.environmentId,
      command.identifier
    );

    if (!interaction || String(interaction._organizationId) !== command.organizationId) {
      throw new NotFoundException(`Interaction "${command.identifier}" was not found.`);
    }

    const delivery = interaction.deliveries?.find(
      (candidate) =>
        candidate.platform === HumanChannelViaEnum.VOICE &&
        !candidate.voiceFailure &&
        Boolean(candidate.platformMessageId)
    );

    if (!delivery) {
      throw new NotFoundException(`Interaction "${command.identifier}" has no connected voice call to play back.`);
    }

    return requireRecording(delivery.platformMessageId);
  }
}
