import { BadGatewayException, BadRequestException, GatewayTimeoutException, Injectable } from '@nestjs/common';
import { CacheService, PinoLogger } from '@novu/application-generic';
import type { HumanInteractionEntity } from '@novu/dal';
import { resolveHumanInteractionCard, VoiceCallFailureCodeEnum } from '@novu/shared';
import { unconfirmedVoiceDialBody, voiceCallFailure, voiceFailureFromDialError } from './voice-call-failure';
import { elevenLabsApiBase, readVoiceChannelConfig } from './voice-config';

/** ElevenLabs retries the failure webhook for about 40 minutes. Two hours covers that. */
export const VOICE_CALL_REGISTRY_TTL_SECONDS = 2 * 60 * 60;

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
 * Redis lookup for the initiation-failure webhook, which only carries a conversation id.
 * The hash tag keeps the key on one cluster slot.
 */
export function voiceCallRegistryKey(conversationId: string): string {
  return `voice-call:{${conversationId}}`;
}

/** The card title, then the body. Nothing is wrapped around it, so the spoken line is the one we passed. */
export function openingLineFor(interaction: Pick<HumanInteractionEntity, 'kind' | 'content'>): string {
  const card = resolveHumanInteractionCard(interaction);
  const title = card.title.trim();
  const body = card.body?.trim();
  const line = [title, body].filter((part): part is string => Boolean(part)).join(' ');

  if (!line) {
    throw new BadRequestException('A voice call needs an opening line.');
  }

  return line.slice(0, OPENING_LINE_MAX_CHARS);
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
        JSON.stringify({
          environmentId: input.environmentId,
          organizationId: input.organizationId,
        }),
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
