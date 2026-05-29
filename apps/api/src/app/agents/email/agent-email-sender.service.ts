import { randomUUID } from 'node:crypto';
import { BadGatewayException, BadRequestException, Injectable } from '@nestjs/common';
import {
  areNovuEmailCredentialsSet,
  buildAgentSharedInbox,
  CalculateLimitNovuIntegration,
  decryptCredentials,
  isAgentSharedInboxEnabled,
  MailFactory,
  PinoLogger,
} from '@novu/application-generic';
import { IntegrationEntity, IntegrationRepository, MessageRepository } from '@novu/dal';
import { ChannelTypeEnum, EmailProviderIdEnum, type IEmailOptions } from '@novu/shared';
import type { ResolvedAgentConfig } from '../channels/agent-config-resolver.service';
import { captureAgentWarning } from '../shared/errors/capture-agent-sentry';

const EMAIL_ALTERNATIVES_SUPPORTED_PROVIDERS = new Set<string>([
  EmailProviderIdEnum.CustomSMTP,
  EmailProviderIdEnum.Outlook365,
  EmailProviderIdEnum.SendGrid,
  EmailProviderIdEnum.SES,
]);

function getErrorResponseBody(err: unknown): unknown {
  if (!err || typeof err !== 'object') {
    return undefined;
  }

  return (err as { response?: { body?: unknown } }).response?.body;
}

function getDeliveryErrorDetail(body: unknown): string | undefined {
  if (!body || typeof body !== 'object') {
    return undefined;
  }

  const responseBody = body as { errors?: Array<{ message?: unknown }>; message?: unknown };
  const firstErrorMessage = responseBody.errors?.[0]?.message;
  if (typeof firstErrorMessage === 'string') {
    return firstErrorMessage;
  }

  return typeof responseBody.message === 'string' ? responseBody.message : undefined;
}

function toDeliveryError(err: unknown): never {
  const base = err instanceof Error ? err.message : String(err);
  const detail = getDeliveryErrorDetail(getErrorResponseBody(err));

  throw new BadGatewayException({
    error: 'delivery_failed',
    message: detail ? `${base}: ${detail}` : base,
  });
}

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
    private readonly messageRepository: MessageRepository
  ) {
    this.logger.setContext(this.constructor.name);
  }

  buildSendEmailCallback(
    config: ResolvedAgentConfig,
    outboundIntegrationId: string | undefined
  ): (params: {
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
  }) => Promise<{ messageId?: string }> {
    return async (params) => {
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

      if (integration.providerId === EmailProviderIdEnum.NovuAgent) {
        throw new BadRequestException(
          `Integration ${outboundIntegrationId} is the inbound NovuAgent provider and cannot be used as an outbound sender`
        );
      }

      if (!integration.active) {
        throw new BadRequestException(
          `Outbound email integration ${outboundIntegrationId} (${integration.providerId}) is inactive`
        );
      }

      if (integration.providerId === EmailProviderIdEnum.Novu) {
        return this.sendViaNovuDemoProvider(config, params, integration);
      }

      const hasUnsupportedAlternatives =
        params.alternatives?.length && !EMAIL_ALTERNATIVES_SUPPORTED_PROVIDERS.has(integration.providerId);
      if (hasUnsupportedAlternatives) {
        if (!params.messageId) {
          this.logger.warn(
            {
              providerId: integration.providerId,
              outboundIntegrationId,
            },
            'Skipping email with custom MIME alternatives because the outbound provider is unsupported and no messageId was supplied'
          );

          return { messageId: undefined };
        }

        this.logger.warn(
          {
            providerId: integration.providerId,
            outboundIntegrationId,
          },
          'Skipping email reaction because the outbound provider does not support custom MIME alternatives'
        );

        return { messageId: params.messageId };
      }

      const decrypted = decryptCredentials(integration.credentials);

      const agentInboundAddress = this.resolveAgentInboundAddress(config, params.from);
      const overrideFrom = config.credentials.useFromAddressOverride
        ? config.credentials.fromAddressOverride?.trim() || undefined
        : undefined;
      const outboundFrom = (decrypted.from as string | undefined)?.trim() || undefined;
      const effectiveFrom = overrideFrom || agentInboundAddress || outboundFrom;
      const replyToHeader = effectiveFrom !== agentInboundAddress ? agentInboundAddress : undefined;
      const senderName = resolveAgentEmailSenderName(config);

      const mailFactory = new MailFactory();
      const handler = mailFactory.getHandler({ ...integration, credentials: decrypted }, effectiveFrom);

      const mailOptions: IEmailOptions = {
        to: [params.to],
        subject: params.subject,
        html: params.html,
        text: params.text,
        alternatives: params.alternatives,
        from: effectiveFrom,
        ...(replyToHeader ? { replyTo: replyToHeader } : {}),
        senderName,
        headers: {
          ...(params.messageId ? { 'Message-ID': wrapMsgId(params.messageId) } : {}),
          ...(params.inReplyTo ? { 'In-Reply-To': wrapMsgId(params.inReplyTo) } : {}),
          ...(params.references
            ? { References: params.references.split(/\s+/).filter(Boolean).map(wrapMsgId).join(' ') }
            : {}),
        },
      };

      const result = await handler.send(mailOptions).catch(toDeliveryError);

      return { messageId: result?.id || params.messageId || '' };
    };
  }

  /**
   * Resolve the canonical inbound address used for Reply-To. Preference order:
   *
   *   1. The synthetic shared inbox `{slug}-{inboxRoutingKey}@<shared-domain>`
   *   2. The fallback supplied by the chat-adapter-email SDK
   */
  resolveAgentInboundAddress(config: ResolvedAgentConfig, fallback: string): string {
    const slug = config.credentials.emailSlugPrefix;
    const inboxRoutingKey = config.credentials.inboxRoutingKey;
    const sharedDisabled = Boolean(config.credentials.sharedInboxDisabled);
    if (isAgentSharedInboxEnabled() && slug && inboxRoutingKey && !sharedDisabled) {
      try {
        return buildAgentSharedInbox(slug, inboxRoutingKey);
      } catch (err) {
        this.logger.warn({ err, agentId: config.agentId }, 'Falling back to params.from - shared inbox build failed');
        captureAgentWarning(err, {
          component: 'chat-sdk',
          operation: 'resolve-agent-inbound-address',
          agentId: config.agentId,
        });
      }
    }

    return fallback;
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
    if (!isAgentSharedInboxEnabled() || !config.credentials.emailSlugPrefix || !config.credentials.inboxRoutingKey) {
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

    const from = buildAgentSharedInbox(config.credentials.emailSlugPrefix, config.credentials.inboxRoutingKey);
    const senderName = resolveAgentEmailSenderName(config);

    const demoIntegration: IntegrationEntity = {
      ...integration,
      credentials: {
        apiKey: process.env.NOVU_EMAIL_INTEGRATION_API_KEY,
        from,
        senderName,
        ipPoolName: 'Demo',
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

    const result = await handler.send(mailOptions).catch(toDeliveryError);

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
}
