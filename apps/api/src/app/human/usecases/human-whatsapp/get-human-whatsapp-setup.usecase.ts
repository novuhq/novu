import { Injectable } from '@nestjs/common';
import { decryptCredentials, InstrumentUsecase } from '@novu/application-generic';
import {
  AgentIntegrationRepository,
  AgentRepository,
  ChannelEndpointRepository,
  type IntegrationEntity,
  IntegrationRepository,
} from '@novu/dal';
import { ENDPOINT_TYPES } from '@novu/shared';
import { provedWhatsAppNumberOf } from '../../../agents/human-relay/whatsapp-number-proof';
import {
  getNovuWhatsAppPlatformConfig,
  hasWhatsAppSendCredentials,
} from '../../../integrations/usecases/whatsapp/whatsapp-credentials.utils';
import { WhatsAppEmbeddedSignupAvailabilityCommand } from '../../../integrations/usecases/whatsapp/whatsapp-embedded-signup-availability.command';
import { WhatsAppEmbeddedSignupAvailability } from '../../../integrations/usecases/whatsapp/whatsapp-embedded-signup-availability.usecase';
import type { HumanWhatsAppSetupResponseDto } from '../../dtos/human-whatsapp.dto';
import { HumanChannelGate } from '../../services/human-channel-gate.service';
import { HumanOperatorService } from '../../services/human-operator.service';
import { WhatsAppFirstMessageService } from '../../services/whatsapp-first-message.service';
import { GetHumanWhatsAppSetupCommand } from './get-human-whatsapp-setup.command';
import { findRelayWhatsAppIntegration } from './relay-whatsapp-integration';
import { toFirstMessageDto } from './submit-human-whatsapp-first-message.usecase';

/**
 * What the WhatsApp drawer on agentinbox.md opens with: whether the channel exists for this organization,
 * the public Meta ids the Facebook button needs, the business number once one is linked, and the operator's
 * own number once they proved it with a code. Only the numbers ever leave here, never a credential.
 */
@Injectable()
export class GetHumanWhatsAppSetup {
  constructor(
    private readonly channelGate: HumanChannelGate,
    private readonly availability: WhatsAppEmbeddedSignupAvailability,
    private readonly agentRepository: AgentRepository,
    private readonly agentIntegrationRepository: AgentIntegrationRepository,
    private readonly integrationRepository: IntegrationRepository,
    private readonly channelEndpointRepository: ChannelEndpointRepository,
    private readonly humanOperator: HumanOperatorService,
    private readonly firstMessage: WhatsAppFirstMessageService
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
    const businessConnected = credentials ? hasWhatsAppSendCredentials(credentials) : false;
    const displayPhoneNumber =
      businessConnected && typeof credentials?.from === 'string' ? credentials.from : undefined;
    const [operatorPhoneNumber, firstMessage] =
      businessConnected && integration
        ? await Promise.all([this.operatorPhoneNumber(command, integration), this.firstMessage.read(integration)])
        : [undefined, undefined];

    return {
      enabled: true,
      available: availability.available,
      ...(availability.reason ? { reason: availability.reason } : {}),
      ...(platform && configId ? { appId: platform.appId, configId } : {}),
      connected: Boolean(operatorPhoneNumber),
      businessConnected,
      ...(displayPhoneNumber ? { displayPhoneNumber } : {}),
      operatorNumberBound: Boolean(operatorPhoneNumber),
      ...(operatorPhoneNumber ? { operatorPhoneNumber } : {}),
      ...(firstMessage ? { firstMessage: toFirstMessageDto(firstMessage) } : {}),
    };
  }

  /** The number the operator bound on this business number with a code, if they did. */
  private async operatorPhoneNumber(
    command: GetHumanWhatsAppSetupCommand,
    integration: IntegrationEntity
  ): Promise<string | undefined> {
    const subscriberId = await this.humanOperator.find(command);
    if (!subscriberId) {
      return undefined;
    }

    const endpoints = await this.channelEndpointRepository.find(
      {
        _environmentId: command.environmentId,
        _organizationId: command.organizationId,
        integrationIdentifier: integration.identifier,
        subscriberId,
        type: ENDPOINT_TYPES.PHONE,
      },
      'type providerId endpoint'
    );

    // A number written through the channel-endpoints API carries no proof, so it never counts as bound.
    return endpoints.map(provedWhatsAppNumberOf).find(Boolean);
  }
}
