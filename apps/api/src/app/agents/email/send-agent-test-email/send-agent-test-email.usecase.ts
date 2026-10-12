import { BadGatewayException, Injectable, NotFoundException } from '@nestjs/common';
import { AnalyticsService, InstrumentUsecase, MailFactory } from '@novu/application-generic';
import { AgentIntegrationRepository, AgentRepository, IntegrationRepository } from '@novu/dal';
import type { IEmailOptions } from '@novu/shared';

import { trackAgentTestEmailSent } from '../../shared/analytics/agent-analytics';
import { resolveAgentOutboundEmail } from '../resolve-agent-outbound-email';
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

    const { senderIntegration, from, senderName } = await resolveAgentOutboundEmail({
      environmentId: command.environmentId,
      organizationId: command.organizationId,
      agentId: agent._id,
      agentName: agent.name,
      integrationRepository: this.integrationRepository,
      agentIntegrationRepository: this.agentIntegrationRepository,
    });

    const mailFactory = new MailFactory();
    const handler = mailFactory.getHandler(senderIntegration, from);

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
      from,
      senderName,
    };

    await handler.send(mailOptions).catch((err) => {
      const base = err instanceof Error ? err.message : String(err);
      const body = (err as { response?: { body?: { errors?: Array<{ message?: string }>; message?: string } } })
        ?.response?.body;
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
}
