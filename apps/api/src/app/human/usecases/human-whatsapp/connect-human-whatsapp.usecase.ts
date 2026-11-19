import { Injectable, NotFoundException } from '@nestjs/common';
import { InstrumentUsecase } from '@novu/application-generic';
import { AgentIntegrationRepository, AgentRepository, IntegrationRepository } from '@novu/dal';
import { HumanChannelViaEnum } from '@novu/shared';
import { WhatsAppEmbeddedSignupCommand } from '../../../integrations/usecases/whatsapp/whatsapp-embedded-signup.command';
import { WhatsAppEmbeddedSignup } from '../../../integrations/usecases/whatsapp/whatsapp-embedded-signup.usecase';
import type { ConnectHumanWhatsAppResponseDto } from '../../dtos/human-whatsapp.dto';
import { HumanChannelGate } from '../../services/human-channel-gate.service';
import { ConnectHumanWhatsAppCommand } from './connect-human-whatsapp.command';
import { findRelayWhatsAppIntegration } from './relay-whatsapp-integration';

/**
 * Finishes Meta Embedded Signup for the operator's own WhatsApp Business account on the relay agent. The
 * same exchange, number check, encrypted save and webhook setup as Novu Connect, run with the relay's
 * identifiers so agentinbox.md never needs a dashboard session. The integration is made and linked first,
 * the way Telegram and Slack are.
 */
@Injectable()
export class ConnectHumanWhatsApp {
  constructor(
    private readonly channelGate: HumanChannelGate,
    private readonly embeddedSignup: WhatsAppEmbeddedSignup,
    private readonly agentRepository: AgentRepository,
    private readonly agentIntegrationRepository: AgentIntegrationRepository,
    private readonly integrationRepository: IntegrationRepository
  ) {}

  private repositories() {
    return {
      agentRepository: this.agentRepository,
      agentIntegrationRepository: this.agentIntegrationRepository,
      integrationRepository: this.integrationRepository,
    };
  }

  @InstrumentUsecase()
  async execute(command: ConnectHumanWhatsAppCommand): Promise<ConnectHumanWhatsAppResponseDto> {
    await this.channelGate.assertViaEnabled(HumanChannelViaEnum.WHATSAPP, command);

    const { agent, integration } = await findRelayWhatsAppIntegration(this.repositories(), command);
    if (!agent) {
      throw new NotFoundException({
        code: 'agent_not_found',
        message: 'There is no agent yet. Run `npx @agentinbox/cli setup` first.',
      });
    }

    if (!integration) {
      throw new NotFoundException({
        code: 'channel_not_found',
        message: 'Add WhatsApp to your agent before connecting a business account.',
      });
    }

    const result = await this.embeddedSignup.execute(
      WhatsAppEmbeddedSignupCommand.create({
        environmentId: command.environmentId,
        organizationId: command.organizationId,
        userId: command.userId,
        code: command.code,
        wabaId: command.wabaId,
        phoneNumberId: command.phoneNumberId,
        agentIdentifier: agent.identifier,
        integrationIdentifier: integration.identifier,
      })
    );

    return {
      success: result.success,
      ...(result.displayPhoneNumber ? { displayPhoneNumber: result.displayPhoneNumber } : {}),
      ...(result.phoneRegistrationWarning ? { phoneRegistrationWarning: result.phoneRegistrationWarning } : {}),
      ...(result.error ? { error: result.error } : {}),
    };
  }
}
