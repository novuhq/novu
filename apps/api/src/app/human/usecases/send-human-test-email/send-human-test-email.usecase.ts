import { BadGatewayException, Injectable, NotFoundException } from '@nestjs/common';
import { InstrumentUsecase, MailFactory } from '@novu/application-generic';
import { AgentIntegrationRepository, AgentRepository, IntegrationRepository, SubscriberRepository } from '@novu/dal';
import { EmailProviderIdEnum, type IEmailOptions } from '@novu/shared';
import { resolveAgentOutboundEmail } from '../../../agents/email/resolve-agent-outbound-email';
import { KeylessEmailGateService } from '../../../keyless/keyless-email-gate.service';
import type { SendHumanTestEmailResponseDto } from '../../dtos/human-agent.dto';
import { buildHumanTestEmail } from '../../email/human-test-email.template';
import { HumanOperatorService } from '../../services/human-operator.service';
import { resolveRelaySender } from '../../services/relay-owner-name';
import { DEFAULT_HUMAN_RELAY_IDENTIFIER } from '../setup-human-relay/setup-human-relay.usecase';
import { SendHumanTestEmailCommand } from './send-human-test-email.command';

/**
 * The onboarding's test email. It goes out from the Agent Email Inbox, so a reply to it comes back to
 * that inbox. The Novu dashboard's test email stays on Novu Email and is not this.
 */
@Injectable()
export class SendHumanTestEmail {
  constructor(
    private readonly agentRepository: AgentRepository,
    private readonly integrationRepository: IntegrationRepository,
    private readonly agentIntegrationRepository: AgentIntegrationRepository,
    private readonly subscriberRepository: SubscriberRepository,
    private readonly operatorService: HumanOperatorService,
    private readonly keylessEmailGate: KeylessEmailGateService
  ) {}

  @InstrumentUsecase()
  async execute(command: SendHumanTestEmailCommand): Promise<SendHumanTestEmailResponseDto> {
    await this.keylessEmailGate.assertAllowed({
      environmentId: command.environmentId,
      organizationId: command.organizationId,
    });

    const identifier = command.agentIdentifier ?? DEFAULT_HUMAN_RELAY_IDENTIFIER;
    const agent = await this.agentRepository.findOne(
      {
        identifier,
        _environmentId: command.environmentId,
        _organizationId: command.organizationId,
      },
      '*'
    );

    if (!agent) {
      throw new NotFoundException('There is no agent yet. Run `npx @agentinbox/cli setup` first.');
    }

    const { senderIntegration, from, senderName } = await resolveAgentOutboundEmail({
      environmentId: command.environmentId,
      organizationId: command.organizationId,
      agentId: agent._id,
      agentName: agent.name,
      providerId: EmailProviderIdEnum.AgentEmailInbox,
      integrationRepository: this.integrationRepository,
      agentIntegrationRepository: this.agentIntegrationRepository,
    });

    const operatorId = await this.operatorService.findForAgent({
      environmentId: command.environmentId,
      organizationId: command.organizationId,
      agentId: agent._id,
    });
    const operator = operatorId
      ? await this.subscriberRepository.findOne(
          { subscriberId: operatorId, _environmentId: command.environmentId },
          'firstName lastName'
        )
      : null;
    const content = buildHumanTestEmail({
      sender: resolveRelaySender({ agent, operator }),
      operatorFirstName: operator?.firstName?.trim() || undefined,
    });
    const mailOptions: IEmailOptions = {
      to: [command.email],
      subject: content.subject,
      html: content.html,
      text: content.text,
      from,
      senderName,
    };

    const handler = new MailFactory().getHandler(senderIntegration, from);
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

    return { success: true };
  }
}
