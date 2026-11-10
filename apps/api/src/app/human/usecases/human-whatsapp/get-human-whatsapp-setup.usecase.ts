import { Injectable } from '@nestjs/common';
import { decryptCredentials, InstrumentUsecase } from '@novu/application-generic';
import { AgentIntegrationRepository, AgentRepository, IntegrationRepository } from '@novu/dal';
import {
  getNovuWhatsAppPlatformConfig,
  hasWhatsAppSendCredentials,
} from '../../../integrations/usecases/whatsapp/whatsapp-credentials.utils';
import { WhatsAppEmbeddedSignupAvailabilityCommand } from '../../../integrations/usecases/whatsapp/whatsapp-embedded-signup-availability.command';
import { WhatsAppEmbeddedSignupAvailability } from '../../../integrations/usecases/whatsapp/whatsapp-embedded-signup-availability.usecase';
import type { HumanWhatsAppSetupResponseDto } from '../../dtos/human-whatsapp.dto';
import { HumanChannelGate } from '../../services/human-channel-gate.service';
import { GetHumanWhatsAppSetupCommand } from './get-human-whatsapp-setup.command';
import { findRelayWhatsAppIntegration } from './relay-whatsapp-integration';

/**
 * What the WhatsApp drawer on agentinbox.md opens with: whether the channel exists for this organization,
 * the public Meta ids the Facebook button needs, and the business number once one is linked. Only the
 * number ever leaves here, never a credential.
 */
@Injectable()
export class GetHumanWhatsAppSetup {
  constructor(
    private readonly channelGate: HumanChannelGate,
    private readonly availability: WhatsAppEmbeddedSignupAvailability,
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
  async execute(command: GetHumanWhatsAppSetupCommand): Promise<HumanWhatsAppSetupResponseDto> {
    if (!(await this.channelGate.isWhatsAppEnabled(command))) {
      return { enabled: false, available: false, connected: false };
    }

    const [availability, { integration }] = await Promise.all([
      this.availability.execute(
        WhatsAppEmbeddedSignupAvailabilityCommand.create({
          environmentId: command.environmentId,
          organizationId: command.organizationId,
          userId: command.userId,
        })
      ),
      findRelayWhatsAppIntegration(this.repositories(), command),
    ]);
    const platform = availability.available ? getNovuWhatsAppPlatformConfig() : undefined;
    // Checked present by the platform config above; the browser's FB.login needs it next to the app id.
    const configId = process.env.NOVU_WHATSAPP_CONFIG_ID?.trim();
    const credentials = integration ? decryptCredentials(integration.credentials ?? {}) : undefined;
    const connected = credentials ? hasWhatsAppSendCredentials(credentials) : false;
    const displayPhoneNumber = connected && typeof credentials?.from === 'string' ? credentials.from : undefined;

    return {
      enabled: true,
      available: availability.available,
      ...(availability.reason ? { reason: availability.reason } : {}),
      ...(platform && configId ? { appId: platform.appId, configId } : {}),
      connected,
      ...(displayPhoneNumber ? { displayPhoneNumber } : {}),
    };
  }
}
