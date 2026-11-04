import { BadGatewayException, GatewayTimeoutException, Injectable } from '@nestjs/common';
import { PinoLogger } from '@novu/application-generic';
import { VoiceCallFailureCodeEnum } from '@novu/shared';
import { VOICE_DIAL_TIMEOUT_MS } from './place-voice-call';
import { unconfirmedVoiceDialBody, voiceCallFailure, voiceFailureFromDialError } from './voice-call-failure';
import { elevenLabsApiBase, readVoiceVerificationConfig } from './voice-config';

/** Room for a short code spoken twice as words, well above the ~70 characters that takes. */
const VERIFICATION_LINE_MAX_CHARS = 400;

const DIGIT_WORDS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine'];

export interface PlaceVerificationCallInput {
  toNumber: string;
  verificationLine: string;
}

export interface PlacedVerificationCall {
  conversationId: string;
  callSid?: string;
}

interface OutboundCallResponse {
  success?: boolean;
  message?: string;
  conversation_id?: string;
  callSid?: string;
}

/**
 * A code spoken as words, one digit at a time, twice.
 *
 * Words rather than digits because ElevenLabs asks for numbers written the way they should be
 * heard; a bare `421903` is read as a quantity. Commas rather than `<break>` tags because a
 * generation carrying many of them destabilizes the voice: it clips, speeds up and adds
 * artifacts. That is what a tag between every digit sounded like.
 */
export function verificationLineFor(code: string): string {
  const spoken = code
    .split('')
    .map((character) => DIGIT_WORDS[Number(character)] ?? character)
    .join(', ');
  const line = `Your code is ${spoken}. Once more: ${spoken}.`;

  return line.slice(0, VERIFICATION_LINE_MAX_CHARS);
}

/**
 * Dials the verification shell. The opening line fills `{{verification_line}}`.
 * No bridge correlation and no call registry: this call is not an interaction.
 */
@Injectable()
export class PlaceVerificationCall {
  constructor(private readonly logger: PinoLogger) {
    this.logger.setContext(this.constructor.name);
  }

  async execute(input: PlaceVerificationCallInput): Promise<PlacedVerificationCall> {
    const config = readVoiceVerificationConfig();
    if (!config) {
      throw new BadGatewayException({
        code: 'voice_not_configured',
        message:
          'Phone verification is not configured on this deployment. Set the shared Twilio number and the verification agent.',
      });
    }

    const payload = {
      agent_id: config.elevenLabsVerifyAgentId,
      agent_phone_number_id: config.elevenLabsPhoneNumberId,
      to_number: input.toNumber,
      conversation_initiation_client_data: {
        dynamic_variables: {
          verification_line: input.verificationLine.slice(0, VERIFICATION_LINE_MAX_CHARS),
        },
      },
    };

    let response: Response;
    try {
      response = await fetch(`${elevenLabsApiBase()}/v1/convai/twilio/outbound-call`, {
        method: 'POST',
        headers: {
          'xi-api-key': config.elevenLabsApiKey,
          'content-type': 'application/json',
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(VOICE_DIAL_TIMEOUT_MS),
      });
    } catch (err) {
      if (isDialTimeout(err)) {
        throw new GatewayTimeoutException(unconfirmedVoiceDialBody());
      }

      this.logger.warn({ err }, 'Verification call failed before ElevenLabs answered');

      throw new BadGatewayException(voiceCallFailure(VoiceCallFailureCodeEnum.CARRIER_FAILURE));
    }

    const bodyText = await response.text();

    if (!response.ok) {
      this.logger.warn(
        { statusCode: response.status, response: bodyText },
        'ElevenLabs rejected the verification call request'
      );

      throw new BadGatewayException(voiceFailureFromDialError(bodyText));
    }

    let parsed: OutboundCallResponse;
    try {
      parsed = JSON.parse(bodyText) as OutboundCallResponse;
    } catch {
      throw new BadGatewayException(voiceCallFailure(VoiceCallFailureCodeEnum.CARRIER_FAILURE));
    }

    if (!parsed.success || !parsed.conversation_id) {
      throw new BadGatewayException(voiceFailureFromDialError(parsed.message ?? bodyText));
    }

    return {
      conversationId: parsed.conversation_id,
      ...(parsed.callSid ? { callSid: parsed.callSid } : {}),
    };
  }
}

function isDialTimeout(err: unknown): boolean {
  return err instanceof Error && (err.name === 'TimeoutError' || err.name === 'AbortError');
}
