import { Injectable, NotFoundException } from '@nestjs/common';
import { buildIntegrationKey, ChannelFactory, InvalidateCacheService, PinoLogger } from '@novu/application-generic';
import { IntegrationRepository } from '@novu/dal';
import { IConfigurations } from '@novu/shared';
import { AutoConfigureIntegrationCommand } from './auto-configure-integration.command';

export interface IAutoConfigureIntegrationResult {
  success: boolean;
  message?: string;
  configurations?: IConfigurations;
}

@Injectable()
export class AutoConfigureIntegration {
  constructor(
    private integrationRepository: IntegrationRepository,
    private channelFactory: ChannelFactory,
    private invalidateCache: InvalidateCacheService,
    private logger: PinoLogger
  ) {
    this.logger.setContext(this.constructor.name);
  }

  async execute(command: AutoConfigureIntegrationCommand): Promise<IAutoConfigureIntegrationResult> {
    this.logger.trace('Executing Auto Configure Integration Command');

    const existingIntegration = await this.integrationRepository.findOne({
      _id: command.integrationId,
      _organizationId: command.organizationId,
    });

    if (!existingIntegration) {
      throw new NotFoundException(`Integration not found, id: ${command.integrationId}`);
    }

    try {
      const channelHandler = this.channelFactory.getHandler(
        existingIntegration,
        existingIntegration.channel as 'email' | 'sms' | 'chat' | 'push'
      );

      const result = channelHandler.autoConfigureInboundWebhook({});
      // todo the return value should return the configurations

      if (result.success) {
        const updatedConfigurations = {};

        await this.integrationRepository.update(
          {
            _id: existingIntegration._id,
            _organizationId: existingIntegration._organizationId,
            _environmentId: existingIntegration._environmentId,
          },
          {
            $set: {
              configurations: updatedConfigurations,
            },
          }
        );

        // Invalidate cache
        await this.invalidateCache.invalidateQuery({
          key: buildIntegrationKey().invalidate({
            _organizationId: command.organizationId,
          }),
        });

        this.logger.trace('Auto-configuration completed successfully', {
          integrationId: command.integrationId,
          organizationId: command.organizationId,
        });

        return {
          success: true,
          message: result.message || 'Integration auto-configured successfully',
          configurations: updatedConfigurations,
        };
      } else {
        this.logger.warn('Auto-configuration failed', {
          integrationId: command.integrationId,
          organizationId: command.organizationId,
          message: result.message,
        });

        return {
          success: false,
          message: result.message || 'Auto-configuration failed',
        };
      }
    } catch (error) {
      this.logger.error('Error during auto-configuration', {
        error: error.message,
        integrationId: command.integrationId,
        organizationId: command.organizationId,
      });

      return {
        success: false,
        message: `Auto-configuration failed: ${error.message}`,
      };
    }
  }
}
