import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { decryptCredentials, InstrumentUsecase, MailFactory } from '@novu/application-generic';
import { AgentRepository, IntegrationRepository } from '@novu/dal';
import { ChannelTypeEnum, EmailProviderIdEnum, IEmailOptions } from '@novu/shared';

import { SendAgentTestEmailCommand } from './send-agent-test-email.command';

@Injectable()
export class SendAgentTestEmail {
  constructor(
    private readonly agentRepository: AgentRepository,
    private readonly integrationRepository: IntegrationRepository
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

    const emailIntegration = await this.integrationRepository.findOne({
      _environmentId: command.environmentId,
      _organizationId: command.organizationId,
      providerId: EmailProviderIdEnum.NovuAgent,
      channel: ChannelTypeEnum.EMAIL,
    });

    if (!emailIntegration) {
      throw new BadRequestException('No Novu Email integration found for this agent.');
    }

    const inboundAddress = emailIntegration.credentials?.inboundAddress as string | undefined;
    const inboundDomain = emailIntegration.credentials?.inboundDomain as string | undefined;

    if (!inboundAddress || !inboundDomain) {
      throw new BadRequestException('Inbound address is not configured. Set the address and domain first.');
    }

    const to = `${inboundAddress}@${inboundDomain}`;

    const senderIntegration = await this.findSenderIntegration(command.environmentId, command.organizationId);
    const mailFactory = new MailFactory();
    const handler = mailFactory.getHandler(senderIntegration, senderIntegration.credentials?.from as string);

    const mailOptions: IEmailOptions = {
      to: [to],
      subject: `Test email for agent "${agent.name}"`,
      html: [
        '<div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">',
        '<h2 style="margin: 0 0 12px;">Test Email</h2>',
        `<p style="color: #555; margin: 0 0 16px;">`,
        'This is an automated test email sent to verify the inbound email configuration ',
        `for agent <strong>${agent.name}</strong>.`,
        '</p>',
        '<p style="color: #555; margin: 0;">',
        'If your agent processes this email successfully, the connection test has passed.',
        '</p>',
        '</div>',
      ].join(''),
      from: senderIntegration.credentials?.from as string,
      senderName: (senderIntegration.credentials?.senderName as string) || 'Novu',
    };

    await handler.send(mailOptions);

    return { success: true };
  }

  private async findSenderIntegration(environmentId: string, organizationId: string) {
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
