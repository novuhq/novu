import { BadGatewayException, BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { AnalyticsService, decryptCredentials, InstrumentUsecase, MailFactory } from '@novu/application-generic';
import { AgentIntegrationRepository, AgentRepository, IntegrationRepository } from '@novu/dal';
import { ChannelTypeEnum, EmailProviderIdEnum, IEmailOptions } from '@novu/shared';

import { trackAgentTestEmailSent } from '../../agent-analytics';
import { SendAgentTestEmailCommand } from './send-agent-test-email.command';

function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

@Injectable()
export class SendAgentTestEmail {
  constructor(
    private readonly agentRepository: AgentRepository,
    private readonly integrationRepository: IntegrationRepository,
    private readonly agentIntegrationRepository: AgentIntegrationRepository,
    private readonly analyticsService: AnalyticsService
  ) {}

  @InstrumentUsecase()
  async execute(command: SendAgentTestEmailCommand): Promise<{ success: boolean }> {
    const agent = await this.agentRepository.findOne(
      {
        identifier: command.agentIdentifier,
        _environmentId: command.environmentId,
        _organizationId: command.organizationId,
      },
      '*'
    );

    if (!agent) {
      throw new NotFoundException(`Agent "${command.agentIdentifier}" not found.`);
    }

    const links = await this.agentIntegrationRepository.findLinksForAgents({
      organizationId: command.organizationId,
      environmentId: command.environmentId,
      agentIds: [agent._id],
    });

    const integrationIds = links.map((l) => l._integrationId).filter(Boolean);
    if (integrationIds.length === 0) {
      throw new BadRequestException('No email integration linked to this agent.');
    }

    const emailIntegration = await this.integrationRepository.findOne({
      _id: { $in: integrationIds } as unknown as string,
      _environmentId: command.environmentId,
      _organizationId: command.organizationId,
      providerId: EmailProviderIdEnum.NovuAgent,
      channel: ChannelTypeEnum.EMAIL,
    });

    if (!emailIntegration) {
      throw new BadRequestException('No Novu Email integration found for this agent.');
    }

    const outboundIntegrationId = emailIntegration.credentials?.outboundIntegrationId as string | undefined;

    const senderIntegration = await this.findSenderIntegration(
      command.environmentId,
      command.organizationId,
      outboundIntegrationId
    );
    const mailFactory = new MailFactory();
    const handler = mailFactory.getHandler(senderIntegration, senderIntegration.credentials?.from as string);

    const escapedName = escapeHtml(agent.name);
    const mailOptions: IEmailOptions = {
      to: [command.targetAddress],
      subject: `Test email for agent "${agent.name}"`,
      html: [
        '<div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">',
        '<h2 style="margin: 0 0 12px;">Test Email</h2>',
        `<p style="color: #555; margin: 0 0 16px;">`,
        'This is an automated test email sent to verify the inbound email configuration ',
        `for agent <strong>${escapedName}</strong>.`,
        '</p>',
        '<p style="color: #555; margin: 0;">',
        'If your agent processes this email successfully, the connection test has passed.',
        '</p>',
        '</div>',
      ].join(''),
      from: senderIntegration.credentials?.from as string,
      senderName: (senderIntegration.credentials?.senderName as string) || 'Novu',
    };

    await handler.send(mailOptions).catch((err) => {
      const base = err instanceof Error ? err.message : String(err);
      const body = (err as any)?.response?.body;
      const detail = Array.isArray(body?.errors) ? body.errors[0]?.message : body?.message;
      throw new BadGatewayException({
        error: 'delivery_failed',
        message: detail ? `${base}: ${detail}` : base,
      });
    });

    trackAgentTestEmailSent(this.analyticsService, {
      userId: command.userId,
      organizationId: command.organizationId,
      environmentId: command.environmentId,
      agentIdentifier: command.agentIdentifier,
    });

    return { success: true };
  }

  private async findSenderIntegration(environmentId: string, organizationId: string, outboundIntegrationId?: string) {
    if (outboundIntegrationId) {
      const configured = await this.integrationRepository.findOne({
        _id: outboundIntegrationId,
        _environmentId: environmentId,
        _organizationId: organizationId,
        channel: ChannelTypeEnum.EMAIL,
        active: true,
      });

      if (!configured) {
        throw new BadRequestException('Configured outbound integration not found or inactive.');
      }

      if (configured.providerId === EmailProviderIdEnum.Novu) {
        return {
          ...configured,
          credentials: {
            apiKey: process.env.NOVU_EMAIL_INTEGRATION_API_KEY,
            from: 'no-reply@novu.co',
            senderName: 'Novu',
            ipPoolName: 'Demo',
          },
        };
      }

      return { ...configured, credentials: decryptCredentials(configured.credentials ?? {}) };
    }

    const novuDemo = await this.integrationRepository.findOne({
      _environmentId: environmentId,
      _organizationId: organizationId,
      providerId: EmailProviderIdEnum.Novu,
      channel: ChannelTypeEnum.EMAIL,
      active: true,
    });

    if (novuDemo) {
      return {
        ...novuDemo,
        credentials: {
          apiKey: process.env.NOVU_EMAIL_INTEGRATION_API_KEY,
          from: 'no-reply@novu.co',
          senderName: 'Novu',
          ipPoolName: 'Demo',
        },
      };
    }

    const anyEmailProvider = await this.integrationRepository.findOne({
      _environmentId: environmentId,
      _organizationId: organizationId,
      channel: ChannelTypeEnum.EMAIL,
      active: true,
      providerId: { $nin: [EmailProviderIdEnum.NovuAgent, EmailProviderIdEnum.Novu] } as unknown as string,
    });

    if (!anyEmailProvider) {
      throw new BadRequestException('No active email provider available to send the test email.');
    }

    return { ...anyEmailProvider, credentials: decryptCredentials(anyEmailProvider.credentials ?? {}) };
  }
}
