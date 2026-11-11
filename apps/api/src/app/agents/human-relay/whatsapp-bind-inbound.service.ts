import { Injectable, NotFoundException } from '@nestjs/common';
import { PinoLogger } from '@novu/application-generic';
import { ChannelEndpointRepository } from '@novu/dal';
import { ENDPOINT_TYPES } from '@novu/shared';
import type { Message, MessageContext, Thread } from 'chat';
import type { ResolvedAgentConfig } from '../channels/agent-config-resolver.service';
import { OutboundGateway } from '../conversation-runtime/egress/outbound.gateway';
import { AgentPlatformEnum } from '../shared/enums/agent-platform.enum';
import { captureAgentException, captureAgentWarning } from '../shared/errors/capture-agent-sentry';
import { toCanonicalE164Phone } from '../shared/util/phone-normalization';
import { BindWhatsAppNumber } from './bind-whatsapp-number.service';
import { ContactHandleService } from './contact-handle.service';
import { extractWhatsAppBindCode, WhatsAppBindCodeService } from './whatsapp-bind-code.service';
import { provedWhatsAppNumberOf, WHATSAPP_NUMBER_LAST_CODE_AT_FIELD } from './whatsapp-number-proof';

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
    private readonly logger: PinoLogger
  ) {
    this.logger.setContext(this.constructor.name);
  }

  /**
   * True when the latest message carried a code and was answered here. A code in a message WhatsApp held back
   * with it (a burst) is used and taken out of the burst, and false lets the ordinary messages around it go on,
   * without the code.
   */
  async tryConsume(
    agentId: string,
    config: ResolvedAgentConfig,
    thread: Thread,
    message: Message,
    messageContext?: MessageContext
  ): Promise<boolean> {
    if (config.platform !== AgentPlatformEnum.WHATSAPP || !config.isHumanRelay) {
      return false;
    }

    const skipped = messageContext?.skipped ?? [];
    const withCode = [...skipped, message].find((inbound) => extractWhatsAppBindCode(inbound.text));
    if (!withCode) {
      return false;
    }

    const code = extractWhatsAppBindCode(withCode.text) as string;
    await this.reply(thread, await this.bind(agentId, config, withCode, code), agentId);

    if (extractWhatsAppBindCode(message.text)) {
      return true;
    }

    // Codes never reach the inbox: the burst goes on without them.
    if (messageContext) {
      messageContext.skipped = skipped.filter((inbound) => !extractWhatsAppBindCode(inbound.text));
    }

    return false;
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

    try {
      const bound = await this.bindWhatsAppNumber.execute(result.payload, phoneNumber);

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
    try {
      await this.channelEndpointRepository.update(
        {
          _environmentId: config.environmentId,
          _organizationId: config.organizationId,
          integrationIdentifier: config.integrationIdentifier,
          type: ENDPOINT_TYPES.PHONE,
          'endpoint.phoneNumber': phoneNumber,
        },
        { $max: { [`endpoint.${WHATSAPP_NUMBER_LAST_CODE_AT_FIELD}`]: new Date().toISOString() } }
      );
    } catch (err) {
      this.logger.warn(err, 'Could not keep when a WhatsApp number last wrote a code');
    }
  }

  private async isBound(config: ResolvedAgentConfig, phoneNumber: string): Promise<boolean> {
    const existing = await this.channelEndpointRepository.findByPlatformIdentity({
      _environmentId: config.environmentId,
      _organizationId: config.organizationId,
      integrationIdentifier: config.integrationIdentifier,
      type: ENDPOINT_TYPES.PHONE,
      endpointField: 'phoneNumber',
      endpointValue: phoneNumber,
    });

    return Boolean(provedWhatsAppNumberOf(existing));
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
