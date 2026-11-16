import { Injectable, NotFoundException } from '@nestjs/common';
import { FeatureFlagsService, PinoLogger } from '@novu/application-generic';
import { ChannelEndpointRepository } from '@novu/dal';
import { ENDPOINT_TYPES, FeatureFlagsKeysEnum } from '@novu/shared';
import type { Message, MessageContext, Thread } from 'chat';
import type { ResolvedAgentConfig } from '../channels/agent-config-resolver.service';
import { OutboundGateway } from '../conversation-runtime/egress/outbound.gateway';
import { AgentPlatformEnum } from '../shared/enums/agent-platform.enum';
import { captureAgentException, captureAgentWarning } from '../shared/errors/capture-agent-sentry';
import { normalizePhoneForMeta, toCanonicalE164Phone } from '../shared/util/phone-normalization';
import { BindWhatsAppNumber } from './bind-whatsapp-number.service';
import { ContactHandleService } from './contact-handle.service';
import {
  extractWhatsAppBindCode,
  type WhatsAppBindCodePayload,
  WhatsAppBindCodeService,
} from './whatsapp-bind-code.service';
import { WhatsAppHeldRelease } from './whatsapp-held-release.service';
import {
  provedWhatsAppNumberOf,
  WHATSAPP_NUMBER_LAST_CODE_AT_FIELD,
  WHATSAPP_NUMBER_PROVED_ON_FIELD,
} from './whatsapp-number-proof';

export const WHATSAPP_BIND_SUCCESS_REPLY = "You're connected. This agent will reach you here on WhatsApp.";
export const WHATSAPP_BIND_DUPLICATE_REPLY = 'This number is already connected. No changes needed.';
export const WHATSAPP_BIND_EXPIRED_REPLY =
  "That code didn't work or has expired. Ask whoever sent it for a new one and send it again.";
export const WHATSAPP_BIND_TOO_MANY_TRIES_REPLY =
  'Too many codes that didn’t work. Wait ten minutes, then send a new one.';
export const WHATSAPP_BIND_INVALID_REPLY =
  "This number couldn't be connected. Ask whoever sent the code for a new one.";

/**
 * A code written to the relay's WhatsApp Business number, the WhatsApp answer to Telegram's `/start`. When a message
 * carries one it is control input: it is used up here, answered on the thread, and never reaches the inbox, so the
 * code is never stored. It runs before the sender is resolved or Who can reach is checked, as the sender is often a
 * stranger until this very message.
 */
@Injectable()
export class WhatsAppBindInbound {
  constructor(
    private readonly codes: WhatsAppBindCodeService,
    private readonly bindWhatsAppNumber: BindWhatsAppNumber,
    private readonly channelEndpointRepository: ChannelEndpointRepository,
    private readonly contactHandles: ContactHandleService,
    private readonly outboundGateway: OutboundGateway,
    private readonly logger: PinoLogger,
    private readonly featureFlagsService: FeatureFlagsService,
    private readonly heldRelease: WhatsAppHeldRelease
  ) {
    this.logger.setContext(this.constructor.name);
  }

  /**
   * The message to go on with, or `null` when a code was all there was. A code anywhere in what WhatsApp delivered
   * together (a burst) is used and answered here, and the ordinary messages around it go on without it: the
   * newest of them takes the code's place when the code came last.
   */
  async tryConsume(
    agentId: string,
    config: ResolvedAgentConfig,
    thread: Thread,
    message: Message,
    messageContext?: MessageContext
  ): Promise<Message | null> {
    if (config.platform !== AgentPlatformEnum.WHATSAPP || !config.isHumanRelay) {
      return message;
    }

    const burst = [...(messageContext?.skipped ?? []), message];
    const withCode = burst.find((inbound) => extractWhatsAppBindCode(inbound.text));
    if (!withCode) {
      return message;
    }

    // WhatsApp turned off for the organization binds nothing: the message goes on as any other would.
    if (!(await this.isWhatsAppEnabled(config))) {
      return message;
    }

    const code = extractWhatsAppBindCode(withCode.text) as string;
    await this.reply(thread, await this.bind(agentId, config, withCode, code), agentId);

    // Codes never reach the inbox: the burst goes on without them.
    const ordinary = burst.filter((inbound) => !extractWhatsAppBindCode(inbound.text));
    const latest = ordinary.pop() ?? null;
    if (messageContext) {
      messageContext.skipped = ordinary;
    }

    // With nothing else to go on, nothing else releases what waited for them, and a code opens the window too.
    if (!latest) {
      await this.releaseHeld(agentId, config, withCode);
    }

    return latest;
  }

  /** Sends what was held for whoever this number is connected to, as an ordinary message from them would. */
  private async releaseHeld(agentId: string, config: ResolvedAgentConfig, message: Message): Promise<void> {
    try {
      const phoneNumber = toCanonicalE164Phone(message.author?.userId ?? '');
      const endpoint = phoneNumber ? await this.boundEndpoint(config, phoneNumber) : null;
      if (!phoneNumber || !endpoint?.subscriberId) {
        return;
      }

      await this.heldRelease.release({
        agentId,
        config,
        subscriberId: endpoint.subscriberId,
        platformUserId: normalizePhoneForMeta(phoneNumber),
      });
    } catch (err) {
      this.logger.warn(err, `[agent:${agentId}] Could not send what was held on WhatsApp after a code`);
    }
  }

  private async bind(agentId: string, config: ResolvedAgentConfig, message: Message, code: string): Promise<string> {
    const phoneNumber = toCanonicalE164Phone(message.author?.userId ?? '');
    if (!phoneNumber) {
      return WHATSAPP_BIND_INVALID_REPLY;
    }

    await this.noteCodeMessage(config, phoneNumber);

    const result = await this.codes.consume(config.integrationId, code, phoneNumber);
    if (result.status === 'too_many_tries') {
      return WHATSAPP_BIND_TOO_MANY_TRIES_REPLY;
    }

    if (result.status === 'missing') {
      return (await this.isBound(config, phoneNumber)) ? WHATSAPP_BIND_DUPLICATE_REPLY : WHATSAPP_BIND_EXPIRED_REPLY;
    }

    return this.bindNumber(agentId, config, message, result.payload, phoneNumber);
  }

  /** Binds the number to whom the code or window was for, and says how it went. */
  private async bindNumber(
    agentId: string,
    config: ResolvedAgentConfig,
    message: Message,
    payload: WhatsAppBindCodePayload,
    phoneNumber: string
  ): Promise<string> {
    try {
      const bound = await this.bindWhatsAppNumber.execute(payload, phoneNumber);

      // The contact card shows their WhatsApp name from the moment they connect.
      await this.contactHandles.refresh({
        config,
        subscriberId: bound.subscriberId,
        platformUserId: phoneNumber,
        message,
      });

      return bound.created ? WHATSAPP_BIND_SUCCESS_REPLY : WHATSAPP_BIND_DUPLICATE_REPLY;
    } catch (err) {
      if (!(err instanceof NotFoundException)) {
        this.logger.error(err, `[agent:${agentId}] Unexpected failure binding a WhatsApp number`);
        captureAgentException(err, { component: 'whatsapp-bind-inbound', operation: 'bind-whatsapp-number', agentId });
      }

      return WHATSAPP_BIND_INVALID_REPLY;
    }
  }

  /**
   * A code message is never stored, but it opened WhatsApp's 24-hour window all the same: kept on the number's
   * endpoint, so a person already connected who sends their old link again can be written to. Nothing to keep for
   * a number that isn't bound yet; binding it records the proof instead.
   */
  private async noteCodeMessage(config: ResolvedAgentConfig, phoneNumber: string): Promise<void> {
    const businessNumberId = config.credentials?.phoneNumberIdentification;
    try {
      await this.channelEndpointRepository.update(
        {
          _environmentId: config.environmentId,
          _organizationId: config.organizationId,
          integrationIdentifier: config.integrationIdentifier,
          type: ENDPOINT_TYPES.PHONE,
          'endpoint.phoneNumber': phoneNumber,
        },
        {
          $max: { [`endpoint.${WHATSAPP_NUMBER_LAST_CODE_AT_FIELD}`]: new Date().toISOString() },
          // The window this opened is with the business number they wrote to.
          ...(businessNumberId ? { $set: { [`endpoint.${WHATSAPP_NUMBER_PROVED_ON_FIELD}`]: businessNumberId } } : {}),
        }
      );
    } catch (err) {
      this.logger.warn(err, 'Could not keep when a WhatsApp number last wrote a code');
    }
  }

  private async isWhatsAppEnabled(config: ResolvedAgentConfig): Promise<boolean> {
    return this.featureFlagsService.getFlag({
      key: FeatureFlagsKeysEnum.IS_AGENT_INBOX_WHATSAPP_ENABLED,
      defaultValue: false,
      organization: { _id: config.organizationId },
      environment: { _id: config.environmentId },
    });
  }

  private async isBound(config: ResolvedAgentConfig, phoneNumber: string): Promise<boolean> {
    return Boolean(await this.boundEndpoint(config, phoneNumber));
  }

  /** The endpoint that proved this number on the integration, or null when nobody did. */
  private async boundEndpoint(config: ResolvedAgentConfig, phoneNumber: string) {
    const existing = await this.channelEndpointRepository.findByPlatformIdentity({
      _environmentId: config.environmentId,
      _organizationId: config.organizationId,
      integrationIdentifier: config.integrationIdentifier,
      type: ENDPOINT_TYPES.PHONE,
      endpointField: 'phoneNumber',
      endpointValue: phoneNumber,
    });

    return provedWhatsAppNumberOf(existing) ? existing : null;
  }

  /** The answer is a reply to their own message, so it is always inside WhatsApp's 24-hour window. */
  private async reply(thread: Thread, text: string, agentId: string): Promise<void> {
    try {
      await this.outboundGateway.replyOnThread(thread, { markdown: text });
    } catch (err) {
      this.logger.warn(err, `[agent:${agentId}] Failed to answer a WhatsApp code`);
      captureAgentWarning(err, { component: 'whatsapp-bind-inbound', operation: 'reply-whatsapp-code', agentId });
    }
  }
}
