import { Injectable, NotFoundException } from '@nestjs/common';
import { ChannelFactory, GetDecryptedIntegrations, PinoLogger } from '@novu/application-generic';
import { IntegrationRepository } from '@novu/dal';
import { AutoConfigureIntegrationResponseDto } from '../../dtos/auto-configure-integration-response.dto';
import { AutoConfigureIntegrationCommand } from './auto-configure-integration.command';

@Injectable()
export class AutoConfigureIntegration {
  constructor(
    private integrationRepository: IntegrationRepository,
    private channelFactory: ChannelFactory,
    private logger: PinoLogger
  ) {
    this.logger.setContext(this.constructor.name);
  }

  async execute(command: AutoConfigureIntegrationCommand): Promise<AutoConfigureIntegrationResponseDto> {
    this.logger.trace('Executing Auto Configure Integration Command');

    const encryptedIntegration = await this.integrationRepository.findOne({
      _id: command.integrationId,
      _organizationId: command.organizationId,
    });

    if (!encryptedIntegration) {
      throw new NotFoundException(`Integration not found, id: ${command.integrationId}`);
    }

    const integration = GetDecryptedIntegrations.getDecryptedCredentials(encryptedIntegration);

    try {
      const channelHandler = this.channelFactory.getHandler(
        integration,
        integration.channel as 'email' | 'sms' | 'chat' | 'push'
      );

      const webhookUrl = `${process.env.API_ROOT_URL}/v2/inbound-webhooks/delivery-providers/${integration._environmentId}/${integration._id}`;
      const result = await channelHandler.autoConfigureInboundWebhook({ webhookUrl });

      if (result.success && result.configurations) {
        const updatedConfigurations = {
          ...integration.configurations,
          ...result.configurations,
        };

        await this.integrationRepository.update(
          {
            _id: integration._id,
            _organizationId: integration._organizationId,
            _environmentId: integration._environmentId,
          },
          {
            $set: {
              configurations: updatedConfigurations,
            },
          }
        );

        this.logger.trace({
          integrationId: command.integrationId,
          organizationId: command.organizationId,
          webhookUrl,
        }, 'Auto-configuration completed successfully');

        return {
          success: true,
          message: result.message || 'Integration auto-configured successfully',
          integration: { ...encryptedIntegration, configurations: updatedConfigurations },
        };
      } else {
        this.logger.warn({
          integrationId: command.integrationId,
          organizationId: command.organizationId,
          message: result.message,
        }, 'Auto-configuration failed');

        return {
          success: false,
          message: result.message || 'Auto-configuration failed',
        };
      }
    } catch (error) {
      this.logger.error(
        { err: error, integrationId: command.integrationId, organizationId: command.organizationId },
        'Error during auto-configuration'
      );

      return {
        success: false,
        message: `Auto-configuration failed: ${error.message}`,
      };
    }
  }
}
