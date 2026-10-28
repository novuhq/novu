import { Controller, HttpCode, HttpStatus, Post, Req, UnauthorizedException } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import { Request } from 'express';
import { verifyElevenLabsSignature } from '../agents/channels/voice/elevenlabs-webhook-signature';
import type { CallInitiationFailureEvent } from '../agents/channels/voice/voice-call-failure';
import {
  type PostCallTranscriptionEvent,
  RecordVoiceCallEnded,
} from './usecases/record-voice-call-ended/record-voice-call-ended.usecase';
import { RecordVoiceCallFailure } from './usecases/record-voice-call-failure/record-voice-call-failure.usecase';

type VoiceWebhookType = 'call_initiation_failure' | 'post_call_transcription';

type ElevenLabsVoiceWebhookEvent = CallInitiationFailureEvent | PostCallTranscriptionEvent | { type?: string };

function isVoiceWebhookType(type: string | undefined): type is VoiceWebhookType {
  return type === 'call_initiation_failure' || type === 'post_call_transcription';
}

/**
 * ElevenLabs posts call-initiation failures and post-call transcripts here.
 * The HMAC secret is the only credential. The route stays out of OpenAPI.
 */
@Controller('human/voice')
@ApiExcludeController()
export class VoiceCallWebhookController {
  constructor(
    private readonly recordVoiceCallFailure: RecordVoiceCallFailure,
    private readonly recordVoiceCallEnded: RecordVoiceCallEnded
  ) {}

  @Post('calls/failure')
  @HttpCode(HttpStatus.OK)
  async recordFailure(@Req() req: Request): Promise<{ ok: true }> {
    const rawBody = (req as Request & { rawBody?: Buffer }).rawBody?.toString('utf8');
    if (!rawBody) {
      throw new UnauthorizedException('Missing request body.');
    }

    const secret = process.env.NOVU_VOICE_ELEVENLABS_WEBHOOK_SECRET;
    if (!verifyElevenLabsSignature(rawBody, req.header('elevenlabs-signature'), secret)) {
      throw new UnauthorizedException('Invalid signature.');
    }

    const event = JSON.parse(rawBody) as ElevenLabsVoiceWebhookEvent;
    if (!isVoiceWebhookType(event.type)) {
      return { ok: true };
    }

    switch (event.type) {
      case 'call_initiation_failure':
        await this.recordVoiceCallFailure.execute(event as CallInitiationFailureEvent);
        break;
      case 'post_call_transcription':
        await this.recordVoiceCallEnded.execute(event as PostCallTranscriptionEvent);
        break;
      default: {
        const unexpected: never = event.type;
        void unexpected;
      }
    }

    return { ok: true };
  }
}
