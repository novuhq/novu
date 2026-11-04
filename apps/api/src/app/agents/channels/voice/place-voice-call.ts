import {
  BadGatewayException,
  BadRequestException,
  GatewayTimeoutException,
  Injectable,
  type OnModuleDestroy,
} from '@nestjs/common';
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

const REGISTRY_RETRY_INTERVAL_MS = 5_000;

/** A bound on what one process holds while Redis is down, rather than one entry per dial forever. */
const MAX_PENDING_REGISTRY_WRITES = 500;

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
export class PlaceVoiceCall implements OnModuleDestroy {
  /** Calls whose failure-webhook lookup is still waiting on Redis, keyed by conversation id. */
  private readonly pendingRegistryWrites = new Map<string, { input: PlaceVoiceCallInput; deadline: number }>();
  private registrySweeper?: ReturnType<typeof setInterval>;

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
    if (await this.writeRegistry(conversationId, input, true)) {
      return;
    }

    this.scheduleRegistryWrite(conversationId, input);
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

  /**
   * Redis can recover after the dial, and the webhook keeps retrying for about
   * 40 minutes, so a missed registry write is worth retrying. One sweeper drains
   * every waiting call: a timer per dial would multiply with call volume exactly
   * when Redis is already struggling.
   */
  private scheduleRegistryWrite(conversationId: string, input: PlaceVoiceCallInput): void {
    if (this.pendingRegistryWrites.size >= MAX_PENDING_REGISTRY_WRITES) {
      this.logger.warn(
        { conversationId, interactionId: input.interactionId },
        'Dropped a voice-call failure lookup: too many are already waiting on Redis'
      );

      return;
    }

    this.pendingRegistryWrites.set(conversationId, {
      input,
      deadline: Date.now() + VOICE_CALL_REGISTRY_TTL_SECONDS * 1000,
    });
    this.startRegistrySweeper();
  }

  private startRegistrySweeper(): void {
    if (this.registrySweeper !== undefined) {
      return;
    }

    this.registrySweeper = setInterval(() => {
      void this.sweepRegistryWrites();
    }, REGISTRY_RETRY_INTERVAL_MS);
    this.registrySweeper.unref?.();
  }

  private async sweepRegistryWrites(): Promise<void> {
    for (const [conversationId, waiting] of [...this.pendingRegistryWrites]) {
      const saved = await this.writeRegistry(conversationId, waiting.input, false);
      if (saved) {
        this.pendingRegistryWrites.delete(conversationId);
        continue;
      }

      if (Date.now() >= waiting.deadline) {
        this.pendingRegistryWrites.delete(conversationId);
        this.logger.warn(
          { conversationId, interactionId: waiting.input.interactionId },
          'Stopped retrying the voice-call failure lookup'
        );
      }
    }

    if (this.pendingRegistryWrites.size === 0) {
      this.stopRegistrySweeper();
    }
  }

  private stopRegistrySweeper(): void {
    if (this.registrySweeper === undefined) {
      return;
    }

    clearInterval(this.registrySweeper);
    this.registrySweeper = undefined;
  }

  onModuleDestroy(): void {
    this.stopRegistrySweeper();
    this.pendingRegistryWrites.clear();
  }
}

function isDialTimeout(err: unknown): boolean {
  return err instanceof Error && (err.name === 'TimeoutError' || err.name === 'AbortError');
}
