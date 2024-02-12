import { Injectable, NotFoundException, Scope } from '@nestjs/common';
import { IntegrationEntity, IntegrationQuery, IntegrationRepository } from '@novu/dal';
import { IEmailProvider, ISmsProvider } from '@novu/stateless';
import { IMailHandler, ISmsHandler, MailFactory, SmsFactory } from '@novu/application-generic';
import { ChannelTypeEnum, providers } from '@novu/shared';

import { GetWebhookSupportStatusCommand } from './get-webhook-support-status.command';
import { ApiException } from '../../../shared/exceptions/api.exception';

@Injectable({ scope: Scope.REQUEST })
export class GetWebhookSupportStatus {
  public readonly mailFactory = new MailFactory();
  public readonly smsFactory = new SmsFactory();
  private provider: IEmailProvider | ISmsProvider;

  constructor(private integrationRepository: IntegrationRepository) {}

  async execute(command: GetWebhookSupportStatusCommand): Promise<boolean> {
    const integration = await this.getIntegration(command);
    if (!integration) {
      throw new NotFoundException(`Integration for ${command.providerOrIntegrationId} was not found`);
    }

    const hasNoCredentials = !integration.credentials || Object.keys(integration.credentials).length === 0;
    if (hasNoCredentials) {
      throw new ApiException(`Integration ${integration._id} doesn't have credentials set up`);
    }

    const { channel, providerId } = integration;
    if (![ChannelTypeEnum.EMAIL, ChannelTypeEnum.SMS].includes(channel)) {
      throw new ApiException(`Webhook for ${providerId}-${channel} is not supported yet`);
    }

    this.createProvider(integration);

    if (!this.provider.getMessageId || !this.provider.parseEventBody) {
      return false;
    }

    return true;
  }

  private async getIntegration(command: GetWebhookSupportStatusCommand) {
    const providerOrIntegrationId = command.providerOrIntegrationId;
    const isProviderId = !!providers.find((el) => el.id === providerOrIntegrationId);

    const query: IntegrationQuery = {
      ...(isProviderId
        ? { providerId: providerOrIntegrationId, credentials: { $exists: true } }
        : { _id: providerOrIntegrationId }),
      _environmentId: command.environmentId,
      _organizationId: command.organizationId,
    };

    return await this.integrationRepository.findOne(query);
  }

  private getHandler(integration: IntegrationEntity): ISmsHandler | IMailHandler | null {
    switch (integration.channel) {
      case 'sms':
        return this.smsFactory.getHandler(integration);
      default:
        return this.mailFactory.getHandler(integration);
    }
  }

  private createProvider(integration: IntegrationEntity) {
    const handler = this.getHandler(integration);
    if (!handler) {
      throw new NotFoundException(`Handler for integration of ${integration.providerId} was not found`);
    }

    handler.buildProvider(integration.credentials);

    this.provider = handler.getProvider();
  }
}
