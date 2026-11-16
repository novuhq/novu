import { Injectable, NotFoundException } from '@nestjs/common';
import { decryptCredentials, InstrumentUsecase } from '@novu/application-generic';
import { AgentIntegrationRepository, AgentRepository, IntegrationRepository } from '@novu/dal';
import { HumanChannelViaEnum } from '@novu/shared';
import { ConfigureWhatsAppWebhookCommand } from '../../../agents/channels/whatsapp/configure-whatsapp-webhook/configure-whatsapp-webhook.command';
import { ConfigureWhatsAppWebhook } from '../../../agents/channels/whatsapp/configure-whatsapp-webhook/configure-whatsapp-webhook.usecase';
import { UpdateIntegrationCommand } from '../../../integrations/usecases/update-integration/update-integration.command';
import { UpdateIntegration } from '../../../integrations/usecases/update-integration/update-integration.usecase';
import { WhatsAppValidateTokenCommand } from '../../../integrations/usecases/whatsapp/whatsapp-validate-token.command';
import { WhatsAppValidateToken } from '../../../integrations/usecases/whatsapp/whatsapp-validate-token.usecase';
import type { ConnectHumanWhatsAppKeysResponseDto, HumanWhatsAppWebhookDto } from '../../dtos/human-whatsapp.dto';
import { HumanChannelGate } from '../../services/human-channel-gate.service';
import { CLEARED_FIRST_MESSAGE } from '../../services/whatsapp-first-message';
import { ConnectHumanWhatsAppKeysCommand } from './connect-human-whatsapp-keys.command';
import { findRelayWhatsAppIntegration } from './relay-whatsapp-integration';

/**
 * Connects the operator's own WhatsApp Business number on the relay agent with keys from a Meta app they set up
 * themselves, the way out when Meta's Facebook button isn't for them. Meta checks the token, number and account
 * first, and nothing is saved when it refuses. The keys are saved encrypted on the relay's WhatsApp channel, as
 * the operator's own app rather than Novu's, then the webhook is set in their Meta app when Meta allows it; when it
 * doesn't, the callback URL and verify token come back for the operator to add by hand.
 */
@Injectable()
export class ConnectHumanWhatsAppKeys {
  constructor(
    private readonly channelGate: HumanChannelGate,
    private readonly validateToken: WhatsAppValidateToken,
    private readonly updateIntegration: UpdateIntegration,
    private readonly configureWebhook: ConfigureWhatsAppWebhook,
    private readonly agentRepository: AgentRepository,
    private readonly agentIntegrationRepository: AgentIntegrationRepository,
    private readonly integrationRepository: IntegrationRepository
  ) {}

  @InstrumentUsecase()
  async execute(command: ConnectHumanWhatsAppKeysCommand): Promise<ConnectHumanWhatsAppKeysResponseDto> {
    await this.channelGate.assertViaEnabled(HumanChannelViaEnum.WHATSAPP, command);

    const { agent, integration } = await findRelayWhatsAppIntegration(
      {
        agentRepository: this.agentRepository,
        agentIntegrationRepository: this.agentIntegrationRepository,
        integrationRepository: this.integrationRepository,
      },
      command
    );
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

    const accessToken = command.accessToken.trim();
    const phoneNumberId = command.phoneNumberId.trim();
    const businessAccountId = command.businessAccountId.trim();

    const check = await this.validateToken.execute(
      WhatsAppValidateTokenCommand.create({
        userId: command.userId,
        organizationId: command.organizationId,
        accessToken,
        phoneNumberIdentification: phoneNumberId,
        businessAccountId,
      })
    );
    if (!check.valid) {
      return {
        success: false,
        error: check.error ?? { code: 'unknown', message: 'Meta didn’t accept these keys. Check them and try again.' },
      };
    }

    const previousAccountId = decryptCredentials(integration.credentials ?? {}).businessAccountId;
    const movedAccount = Boolean(previousAccountId) && previousAccountId !== businessAccountId;

    await this.updateIntegration.execute(
      UpdateIntegrationCommand.create({
        userId: command.userId,
        organizationId: command.organizationId,
        environmentId: command.environmentId,
        userEnvironmentId: command.environmentId,
        integrationId: integration._id,
        credentials: {
          apiToken: accessToken,
          phoneNumberIdentification: phoneNumberId,
          businessAccountId,
          secretKey: command.appSecret.trim(),
          // Their own Meta app now, not Novu's: a number connected with Facebook before stops using Novu's app.
          isNovuManaged: false,
          ...(check.displayPhoneNumber ? { from: check.displayPhoneNumber } : {}),
          // A first message approved on another business account isn't approved on this one.
          ...(movedAccount ? CLEARED_FIRST_MESSAGE : {}),
        },
        check: false,
        allowNovuManagedWhatsAppCredentials: true,
      })
    );

    return {
      success: true,
      ...(check.displayPhoneNumber ? { displayPhoneNumber: check.displayPhoneNumber } : {}),
      webhook: await this.setUpWebhook(command, agent.identifier, integration.identifier, integration._id),
    };
  }

  /** Sets the webhook in the operator's Meta app, or says what to add there when Meta didn't allow it. */
  private async setUpWebhook(
    command: ConnectHumanWhatsAppKeysCommand,
    agentIdentifier: string,
    integrationIdentifier: string,
    integrationId: string
  ): Promise<HumanWhatsAppWebhookDto> {
    const result = await this.configureWebhook.execute(
      ConfigureWhatsAppWebhookCommand.create({
        userId: command.userId,
        organizationId: command.organizationId,
        environmentId: command.environmentId,
        agentIdentifier,
        integrationIdentifier,
      })
    );

    if (result.success) {
      return { configured: true, callbackUrl: result.callbackUrl };
    }

    // The verify token was made when the keys were saved: the operator pastes it next to the callback URL in their
    // own Meta app, so it goes back to their dashboard, and only there.
    const saved = await this.integrationRepository.findOne(
      { _id: integrationId, _environmentId: command.environmentId, _organizationId: command.organizationId },
      'credentials'
    );
    const credentials = decryptCredentials(saved?.credentials ?? {});
    const verifyToken = typeof credentials.token === 'string' ? credentials.token : undefined;

    return {
      configured: false,
      callbackUrl: result.callbackUrl,
      ...(verifyToken ? { verifyToken } : {}),
      ...(result.reason?.message ? { reason: result.reason.message } : {}),
    };
  }
}
