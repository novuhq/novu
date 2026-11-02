import { BadGatewayException, BadRequestException, GatewayTimeoutException, Injectable } from '@nestjs/common';
import { CacheService, PinoLogger } from '@novu/application-generic';
import type { HumanInteractionEntity } from '@novu/dal';
import { resolveHumanInteractionCard, VoiceCallFailureCodeEnum } from '@novu/shared';
import { unconfirmedVoiceDialBody, voiceCallFailure, voiceFailureFromDialError } from './voice-call-failure';
import {
  createDialingHandoff,
  serializeVoiceCallHandoff,
  VOICE_CALL_REGISTRY_TTL_SECONDS,
  voiceCallRegistryKey,
} from './voice-call-handoff';
import { elevenLabsApiBase, readVoiceChannelConfig } from './voice-config';

export { VOICE_CALL_REGISTRY_TTL_SECONDS, voiceCallRegistryKey };

/** MCP stops waiting for a send after 30 seconds, so one dial has to finish inside that. */
export const VOICE_DIAL_TIMEOUT_MS = 20_000;

const REGISTRY_WRITE_ATTEMPTS = 3;
const REGISTRY_RETRY_INTERVAL_MS = 5_000;

const OPENING_LINE_MAX_CHARS = 500;

export interface PlaceVoiceCallInput {
  interactionId: string;
  environmentId: string;
  organizationId: string;
  subscriberId: string;
  toNumber: string;
  openingLine: string;
}

/** Only a name the operator chose is spoken. The default stands in for "unnamed". */
export interface OpeningLineOptions {
  agentName?: string;
}

export interface PlacedVoiceCall {
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
 * What the person hears when they pick up. Hello and the agent's name (when
 * the operator chose one) come first. The card is spoken right after, so it
 * has to be written the way a person would say it, not as a title on a screen.
 */
export function openingLineFor(
  interaction: Pick<HumanInteractionEntity, 'kind' | 'content'>,
  options: OpeningLineOptions = {}
): string {
  const card = resolveHumanInteractionCard(interaction);
  const choices = 'options' in card ? card.options.map((option) => option.label) : [];
  const ask = [card.title, card.subtitle, card.body, ...choices]
    .map((part) => spoken(part))
    .filter(Boolean)
    .join(' ');

  if (!ask) {
    throw new BadRequestException('A voice call needs an opening line.');
  }

  const name = (options.agentName ?? '').replace(/[[\]]/g, ' ').replace(/\s+/g, ' ').trim();
  const greeting = name ? `Hi, it's ${name}.` : 'Hi.';

  return `${greeting} ${ask.slice(0, OPENING_LINE_MAX_CHARS - greeting.length - 1)}`;
}

/**
 * Eleven v4 reads `[...]` as an audio-tag direction, so a card titled
 * "[URGENT] Deploy failed" would lose the first word. Terminal punctuation is
 * what makes the voice pause between the title and the body.
 */
function spoken(part: string | undefined): string {
  const plain = (part ?? '').replace(/[[\]]/g, ' ').replace(/\s+/g, ' ').trim();

  if (!plain) {
    return '';
  }

  return /[.!?]$/.test(plain) ? plain : `${plain}.`;
}

/**
 * Dials the shared number through ElevenLabs. The shell is never patched.
 * The opening line fills `{{opening_line}}` on this request, and the bridge
 * correlation travels beside it.
 */
@Injectable()
export class PlaceVoiceCall {
  constructor(
    private readonly cacheService: CacheService,
    private readonly logger: PinoLogger
  ) {
    this.logger.setContext(this.constructor.name);
  }

  async execute(input: PlaceVoiceCallInput): Promise<PlacedVoiceCall> {
    const config = readVoiceChannelConfig();
    if (!config) {
      throw new BadGatewayException({
        code: 'voice_not_configured',
        message: 'Voice is not configured on this deployment. Set the shared Twilio number and ElevenLabs credentials.',
      });
    }

    const payload = {
      agent_id: config.elevenLabsAgentId,
      agent_phone_number_id: config.elevenLabsPhoneNumberId,
      to_number: input.toNumber,
      conversation_initiation_client_data: {
        dynamic_variables: {
          opening_line: input.openingLine,
        },
        custom_llm_extra_body: {
          interactionId: input.interactionId,
          environmentId: input.environmentId,
          subscriberId: input.subscriberId,
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

      throw new BadGatewayException(voiceCallFailure(VoiceCallFailureCodeEnum.CARRIER_FAILURE));
    }
    const bodyText = await response.text();

    if (!response.ok) {
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

    await this.remember(parsed.conversation_id, input);

    return {
      conversationId: parsed.conversation_id,
      ...(parsed.callSid ? { callSid: parsed.callSid } : {}),
    };
  }

  private async remember(conversationId: string, input: PlaceVoiceCallInput): Promise<void> {
    for (let attempt = 1; attempt <= REGISTRY_WRITE_ATTEMPTS; attempt += 1) {
      if (await this.writeRegistry(conversationId, input, true)) {
        return;
      }
    }

    this.retryRegistry(conversationId, input);
  }

  private async writeRegistry(
    conversationId: string,
    input: PlaceVoiceCallInput,
    logFailure: boolean
  ): Promise<boolean> {
    try {
      await this.cacheService.set(
        voiceCallRegistryKey(conversationId),
        serializeVoiceCallHandoff(createDialingHandoff(input)),
        { ttl: VOICE_CALL_REGISTRY_TTL_SECONDS, jitter: false }
      );

      return true;
    } catch (err) {
      if (logFailure) {
        this.logger.warn(
          { err, conversationId, interactionId: input.interactionId },
          'Voice call was placed but the failure-webhook lookup was not stored'
        );
      }

      return false;
    }
  }

  /** Redis can recover after the dial. The webhook keeps retrying for about 40 minutes. */
  private retryRegistry(conversationId: string, input: PlaceVoiceCallInput): void {
    const startedAt = Date.now();
    const retryWindowMs = VOICE_CALL_REGISTRY_TTL_SECONDS * 1000;
    const timer = setInterval(() => {
      void this.writeRegistry(conversationId, input, false).then((saved) => {
        const expired = Date.now() - startedAt >= retryWindowMs;
        if (!saved && !expired) {
          return;
        }

        clearInterval(timer);
        if (!saved) {
          this.logger.warn(
            { conversationId, interactionId: input.interactionId },
            'Stopped retrying the voice-call failure lookup'
          );
        }
      });
    }, REGISTRY_RETRY_INTERVAL_MS);
    timer.unref?.();
  }
}

function isDialTimeout(err: unknown): boolean {
  return err instanceof Error && (err.name === 'TimeoutError' || err.name === 'AbortError');
}
