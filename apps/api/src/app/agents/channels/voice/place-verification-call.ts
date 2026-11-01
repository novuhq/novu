import { BadGatewayException, GatewayTimeoutException, Injectable } from '@nestjs/common';
import { PinoLogger } from '@novu/application-generic';
import { VoiceCallFailureCodeEnum } from '@novu/shared';
import { VOICE_DIAL_TIMEOUT_MS } from './place-voice-call';
import { unconfirmedVoiceDialBody, voiceCallFailure, voiceFailureFromDialError } from './voice-call-failure';
import { elevenLabsApiBase, readVoiceVerificationConfig } from './voice-config';

/**
 * Room for a 6-digit code, spoken twice, with a break tag between each digit.
 * Slicing inside a tag would be read aloud, so this stays above that line.
 */
const VERIFICATION_LINE_MAX_CHARS = 400;

/** Flash v2 pause. Longer than a comma, short of the point where many breaks destabilize the voice. */
const DIGIT_BREAK = '<break time="0.7s" />';

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

/** Digits spoken one at a time, twice, so a code is not read as a single number. */
export function verificationLineFor(code: string): string {
  const paced = code.split('').join(`. ${DIGIT_BREAK} `);
  const line = `Your code is ${paced}. Again. ${DIGIT_BREAK} ${paced}.`;

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
