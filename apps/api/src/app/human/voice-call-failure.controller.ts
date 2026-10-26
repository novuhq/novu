import { Controller, HttpCode, HttpStatus, Post, Req, UnauthorizedException } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import { Request } from 'express';
import { verifyElevenLabsSignature } from '../agents/channels/voice/elevenlabs-webhook-signature';
import type { CallInitiationFailureEvent } from '../agents/channels/voice/voice-call-failure';
import { RecordVoiceCallFailure } from './usecases/record-voice-call-failure/record-voice-call-failure.usecase';

/**
 * ElevenLabs posts call-initiation failures here. The HMAC secret is the only
 * credential. The route stays out of OpenAPI.
 */
@Controller('human/voice')
@ApiExcludeController()
export class VoiceCallFailureController {
  constructor(private readonly recordVoiceCallFailure: RecordVoiceCallFailure) {}

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

    const event = JSON.parse(rawBody) as CallInitiationFailureEvent;
    await this.recordVoiceCallFailure.execute(event);

    return { ok: true };
  }
}
