import { randomUUID } from 'node:crypto';
import { BadRequestException, Injectable } from '@nestjs/common';
import {
  AgentEmailInboxQuotaService,
  areNovuEmailCredentialsSet,
  CalculateLimitNovuIntegration,
  decryptCredentials,
  isAgentSharedInboxEnabled,
  MailFactory,
  PinoLogger,
  resolvePublishedAgentInboxAddress,
} from '@novu/application-generic';
import { IntegrationEntity, IntegrationRepository, MessageRepository } from '@novu/dal';
import { ChannelTypeEnum, EmailProviderIdEnum, type IEmailOptions, isAgentInboxProvider } from '@novu/shared';
import { isKeylessOrganization } from '../../keyless/keyless-organization.helpers';
import type { ResolvedAgentConfig } from '../channels/agent-config-resolver.service';
import { captureAgentWarning } from '../shared/errors/capture-agent-sentry';
import { toDeliveryError } from '../shared/util/delivery-error.util';
import { resolveAgentEmailIpPoolName } from './agent-email-ip-pool';

const EMAIL_ALTERNATIVES_SUPPORTED_PROVIDERS = new Set<string>([
  EmailProviderIdEnum.CustomSMTP,
  EmailProviderIdEnum.Outlook365,
  EmailProviderIdEnum.SendGrid,
  EmailProviderIdEnum.SES,
]);

type AgentOutboundEmailParams = {
  from: string;
  to: string;
  subject: string;
  html: string;
  text?: string;
  alternatives?: Array<{
    contentType: string;
    content: string | Buffer;
  }>;
  inReplyTo?: string;
  references?: string;
  messageId?: string;
};

/** Ensure a Message-ID value is wrapped in RFC 5322 angle brackets. */
function wrapMsgId(id: string): string {
  const trimmed = id.trim();

  return trimmed.startsWith('<') && trimmed.endsWith('>') ? trimmed : `<${trimmed}>`;
}

export function resolveAgentEmailSenderName(config: ResolvedAgentConfig): string {
  return config.credentials.senderName?.trim() || config.agentName;
}

@Injectable()
export class AgentEmailSender {
  constructor(
    private readonly logger: PinoLogger,
    private readonly integrationRepository: IntegrationRepository,
    private readonly calculateLimitNovuIntegration: CalculateLimitNovuIntegration,
    private readonly messageRepository: MessageRepository,
    private readonly inboxQuota: AgentEmailInboxQuotaService
  ) {
    this.logger.setContext(this.constructor.name);
  }

  buildSendEmailCallback(
    config: ResolvedAgentConfig,
    outboundIntegrationId: string | undefined
  ): (params: AgentOutboundEmailParams) => Promise<{ messageId?: string }> {
    return async (params) => {
      const integration = await this.loadActiveOutboundIntegration(config, outboundIntegrationId);

      if (integration.providerId === EmailProviderIdEnum.Novu) {
        return this.sendViaNovuDemoProvider(config, params, integration);
      }

      return this.sendViaCustomProvider(config, params, integration, outboundIntegrationId);
    };
  }

  private async loadActiveOutboundIntegration(
    config: ResolvedAgentConfig,
    outboundIntegrationId: string | undefined
  ): Promise<IntegrationEntity> {
    if (!outboundIntegrationId) {
      throw new BadRequestException(
        'Email agent integration is missing outboundIntegrationId. Reconfigure the agent email setup.'
      );
    }

    const integration = await this.integrationRepository.findOne({
      _id: outboundIntegrationId,
      _environmentId: config.environmentId,
      _organizationId: config.organizationId,
      channel: ChannelTypeEnum.EMAIL,
    });

    if (!integration) {
      throw new BadRequestException(
        `Outbound email integration ${outboundIntegrationId} not found or does not belong to this environment`
      );
    }

    if (isAgentInboxProvider(integration.providerId)) {
      throw new BadRequestException(
        `Integration ${outboundIntegrationId} is an inbound agent inbox and cannot be used as an outbound sender`
      );
    }

    if (!integration.active) {
      throw new BadRequestException(
        `Outbound email integration ${outboundIntegrationId} (${integration.providerId}) is inactive`
      );
    }

    return integration;
  }

  private async sendViaCustomProvider(
    config: ResolvedAgentConfig,
    params: AgentOutboundEmailParams,
    integration: IntegrationEntity,
    outboundIntegrationId: string | undefined
  ): Promise<{ messageId?: string }> {
    const skipped = this.skipUnsupportedAlternatives(params, integration.providerId, outboundIntegrationId);
    if (skipped) {
      return skipped;
    }

    const decrypted = decryptCredentials(integration.credentials);
    const agentInboundAddress = this.resolveAgentInboundAddress(config, params.from);
    const overrideFrom = config.credentials.useFromAddressOverride
      ? config.credentials.fromAddressOverride?.trim() || undefined
      : undefined;
    const outboundFrom = (decrypted.from as string | undefined)?.trim() || undefined;
    const effectiveFrom = overrideFrom || agentInboundAddress || outboundFrom;
    const replyToHeader = effectiveFrom !== agentInboundAddress ? agentInboundAddress : undefined;

    const mailFactory = new MailFactory();
    const handler = mailFactory.getHandler({ ...integration, credentials: decrypted }, effectiveFrom);
    const result = await this.accountInboxSend(config, () =>
      handler
        .send(this.buildMailOptions(params, effectiveFrom, replyToHeader, resolveAgentEmailSenderName(config)))
        .catch(toDeliveryError)
    );

    return { messageId: result?.id || params.messageId || '' };
  }

  /** Reactions need a custom MIME part most providers cannot send; skip those instead of failing the send. */
  private skipUnsupportedAlternatives(
    params: AgentOutboundEmailParams,
    providerId: string,
    outboundIntegrationId: string | undefined
  ): { messageId?: string } | undefined {
    const unsupported = Boolean(params.alternatives?.length) && !EMAIL_ALTERNATIVES_SUPPORTED_PROVIDERS.has(providerId);
    if (!unsupported) {
      return undefined;
    }

    if (!params.messageId) {
      this.logger.warn(
        { providerId, outboundIntegrationId },
        'Skipping email with custom MIME alternatives because the outbound provider is unsupported and no messageId was supplied'
      );

      return { messageId: undefined };
    }

    this.logger.warn(
      { providerId, outboundIntegrationId },
      'Skipping email reaction because the outbound provider does not support custom MIME alternatives'
    );

    return { messageId: params.messageId };
  }

  private buildMailOptions(
    params: AgentOutboundEmailParams,
    from: string | undefined,
    replyTo: string | undefined,
    senderName: string
  ): IEmailOptions {
    return {
      to: [params.to],
      subject: params.subject,
      html: params.html,
      text: params.text,
      alternatives: params.alternatives,
      from,
      ...(replyTo ? { replyTo } : {}),
      senderName,
      headers: {
        ...(params.messageId ? { 'Message-ID': wrapMsgId(params.messageId) } : {}),
        ...(params.inReplyTo ? { 'In-Reply-To': wrapMsgId(params.inReplyTo) } : {}),
        ...(params.references
          ? { References: params.references.split(/\s+/).filter(Boolean).map(wrapMsgId).join(' ') }
          : {}),
      },
    };
  }

  /**
   * Resolve the canonical inbound address used for Reply-To. Preference order:
   *
   *   1. The synthetic shared inbox `{slug}-{inboxRoutingKey}@<shared-domain>`
   *   2. The fallback supplied by the chat-adapter-email SDK
   */
  resolveAgentInboundAddress(config: ResolvedAgentConfig, fallback: string): string {
    return this.resolveSharedInboxAddress(config) ?? fallback;
  }

  /**
   * The synthetic shared inbox `{slug}-{inboxRoutingKey}@<shared-domain>`, or
   * `undefined` when this deployment/agent has none (self-hosted, shared inbox
   * disabled, or the address could not be built).
   */
  resolveSharedInboxAddress(config: ResolvedAgentConfig): string | undefined {
    try {
      return resolvePublishedAgentInboxAddress(config.credentials, { name: config.agentName });
    } catch (err) {
      this.logger.warn({ err, agentId: config.agentId }, 'Falling back to params.from - shared inbox build failed');
      captureAgentWarning(err, {
        component: 'chat-sdk',
        operation: 'resolve-agent-inbound-address',
        agentId: config.agentId,
      });

      return undefined;
    }
  }

  /**
   * Outbound demo path: the agent is wired to the bundled Novu Email demo
   * provider row. Quota-gated by the same per-environment 300/month cap as
   * workflow notification emails.
   */
  private async sendViaNovuDemoProvider(
    config: ResolvedAgentConfig,
    params: {
      from: string;
      to: string;
      subject: string;
      html: string;
      text?: string;
      alternatives?: Array<{ contentType: string; content: string | Buffer }>;
      inReplyTo?: string;
      references?: string;
      messageId?: string;
    },
    integration: IntegrationEntity
  ): Promise<{ messageId?: string }> {
    const fromAddress = this.resolveSharedInboxAddress(config);
    if (!isAgentSharedInboxEnabled() || !fromAddress) {
      throw new BadRequestException(
        'Email agent integration requires either a shared agent inbox or a custom outbound email provider. ' +
          'Configure one in the agent email setup.'
      );
    }

    if (config.credentials.sharedInboxDisabled) {
      throw new BadRequestException(
        'The Novu demo sender requires the shared inbox to be enabled. ' +
          'Re-enable it or attach an outbound email provider.'
      );
    }

    const limit = await this.calculateLimitNovuIntegration.execute({
      channelType: ChannelTypeEnum.EMAIL,
      environmentId: config.environmentId,
      organizationId: config.organizationId,
    });
    if (limit && limit.count >= limit.limit) {
      throw new BadRequestException(
        `Novu demo email quota exhausted for this environment (${limit.count}/${limit.limit} this month). Attach an outbound email provider (e.g. SendGrid) to remove this cap.`
      );
    }

    if (!areNovuEmailCredentialsSet()) {
      throw new BadRequestException(
        'Novu demo email is not configured on this deployment. Attach an outbound email provider to send replies.'
      );
    }

    const from = fromAddress;
    const senderName = resolveAgentEmailSenderName(config);

    const demoIntegration: IntegrationEntity = {
      ...integration,
      credentials: {
        apiKey: process.env.NOVU_EMAIL_INTEGRATION_API_KEY,
        from,
        senderName,
        ipPoolName: resolveAgentEmailIpPoolName(config.providerId),
      },
    };

    const mailFactory = new MailFactory();
    const handler = mailFactory.getHandler(demoIntegration, from);

    const mailOptions: IEmailOptions = {
      to: [params.to],
      subject: params.subject,
      html: params.html,
      text: params.text,
      alternatives: params.alternatives,
      from,
      senderName,
      headers: {
        ...(params.messageId ? { 'Message-ID': wrapMsgId(params.messageId) } : {}),
        ...(params.inReplyTo ? { 'In-Reply-To': wrapMsgId(params.inReplyTo) } : {}),
        ...(params.references
          ? { References: params.references.split(/\s+/).filter(Boolean).map(wrapMsgId).join(' ') }
          : {}),
      },
    };

    const result = await this.accountInboxSend(config, () => handler.send(mailOptions).catch(toDeliveryError));

    const messageIdForReturn = result?.id || params.messageId || '';

    try {
      await this.messageRepository.create({
        _environmentId: config.environmentId,
        _organizationId: config.organizationId,
        channel: ChannelTypeEnum.EMAIL,
        providerId: EmailProviderIdEnum.Novu,
        email: params.to,
        subject: params.subject,
        transactionId: messageIdForReturn || randomUUID(),
        payload: {
          agentId: config.agentId,
          html: params.html,
          text: params.text,
        },
        tags: ['agent-demo-reply'],
      });
    } catch (err) {
      this.logger.warn(
        { err, environmentId: config.environmentId, agentId: config.agentId },
        'Failed to persist Novu demo email message for quota accounting'
      );
      captureAgentWarning(err, {
        component: 'chat-sdk',
        operation: 'persist-demo-email-quota',
        agentId: config.agentId,
        extra: { environmentId: config.environmentId },
      });
    }

    return { messageId: messageIdForReturn };
  }

  /**
   * Agent Email Inbox credits are counted only when the outbound provider
   * accepts the message. Dashboard Novu Email sends do not enter this path.
   * Keyless orgs share one organization id, so the org-wide counters would
   * pool every demo together — the claim reply is metered on its own.
   */
  private async accountInboxSend<T>(config: ResolvedAgentConfig, send: () => Promise<T>): Promise<T> {
    if (config.providerId !== EmailProviderIdEnum.AgentEmailInbox || isKeylessOrganization(config.organizationId)) {
      return send();
    }

    const attempt = await this.inboxQuota.beginSend(config.organizationId);

    try {
      const result = await send();
      attempt.accept();

      return result;
    } catch (err) {
      await attempt.release();

      throw err;
    }
  }
}
