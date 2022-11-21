import { Injectable, NotFoundException } from '@nestjs/common';
import { IntegrationEntity, IntegrationRepository } from '@novu/dal';
import { IEmailProvider, ISmsProvider } from '@novu/stateless';
import { MailFactory, SmsFactory, ISmsHandler, IMailHandler } from '@novu/application-generic';
import { GetWebhookSupportStatusCommand } from './get-webhook-support-status.command';

@Injectable()
export class GetWebhookSupportStatus {
  public readonly mailFactory = new MailFactory();
  public readonly smsFactory = new SmsFactory();
  private provider: IEmailProvider | ISmsProvider;

  constructor(private integrationRepository: IntegrationRepository) {}

  async execute(command: GetWebhookSupportStatusCommand): Promise<boolean> {
    const { providerId, channel } = command;

    const integration: IntegrationEntity = await this.getIntegration(command);

    if (!integration) {
      throw new NotFoundException(`Integration for ${providerId} was not found`);
    }

    this.createProvider(integration, providerId, channel);

    if (!this.provider.getMessageId || !this.provider.parseEventBody) {
      return false;
    }

    return true;
  }

  private async getIntegration(command: GetWebhookSupportStatusCommand): Promise<IntegrationEntity> {
    return await this.integrationRepository.findOne({
      _environmentId: command.environmentId,
      _organizationId: command.organizationId,
      providerId: command.providerId,
      channel: command.channel,
    });
  }

  private getHandler(integration: IntegrationEntity, channel: 'email' | 'sms'): ISmsHandler | IMailHandler {
    switch (channel) {
      case 'sms':
        return this.smsFactory.getHandler(integration);
      default:
        return this.mailFactory.getHandler(integration);
    }
  }

  private createProvider(integration: IntegrationEntity, providerId: string, type: 'sms' | 'email') {
    const handler = this.getHandler(integration, type);
    if (!handler) {
      throw new NotFoundException(`Handler for integration of ${providerId} was not found`);
    }
    handler.buildProvider({});

    this.provider = handler.getProvider();
  }
}
