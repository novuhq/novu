import { SendMessageType } from './send-message-type.usecase';
import { IntegrationEntity, MessageRepository, SubscriberEntity, SubscriberRepository } from '@novu/dal';
import { CreateLog } from '../../../logs/usecases/create-log/create-log.usecase';
import { CreateExecutionDetails } from '../../../execution-details/usecases/create-execution-details/create-execution-details.usecase';
import { SendMessageCommand } from './send-message.command';
import { Cached } from '../../../shared/interceptors';
import { CacheKeyPrefixEnum } from '../../../shared/services/cache';
import {
  GetDecryptedIntegrations,
  GetDecryptedIntegrationsCommand,
} from '../../../integrations/usecases/get-decrypted-integrations';
import { ChannelTypeEnum } from '@novu/shared';

export abstract class SendMessageBase extends SendMessageType {
  abstract readonly channelType: ChannelTypeEnum;
  protected subscriber: SubscriberEntity;
  protected integration: IntegrationEntity;
  private readonly channelsToSkipIntegrationInitialize = [ChannelTypeEnum.CHAT, ChannelTypeEnum.IN_APP];
  protected constructor(
    protected messageRepository: MessageRepository,
    protected createLogUsecase: CreateLog,
    protected createExecutionDetails: CreateExecutionDetails,
    protected subscriberRepository: SubscriberRepository,
    protected getDecryptedIntegrationsUsecase?: GetDecryptedIntegrations
  ) {
    super(messageRepository, createLogUsecase, createExecutionDetails);
  }

  protected async initialize(command: SendMessageCommand) {
    this.subscriber = await this.getSubscriber({
      environmentId: command.environmentId,
      _id: command.subscriberId,
    });

    if (!this.channelsToSkipIntegrationInitialize.some((channel) => channel === this.channelType)) {
      this.integration = await this.getIntegration(
        GetDecryptedIntegrationsCommand.create({
          organizationId: command.organizationId,
          environmentId: command.environmentId,
          channelType: this.channelType,
          findOne: true,
          active: true,
        })
      );
    }
  }

  @Cached(CacheKeyPrefixEnum.SUBSCRIBER)
  private async getSubscriber({ _id, environmentId }: { _id: string; environmentId: string }) {
    return await this.subscriberRepository.findOne({
      _environmentId: environmentId,
      _id: _id,
    });
  }

  @Cached(CacheKeyPrefixEnum.INTEGRATION)
  protected async getIntegration(getDecryptedIntegrationsCommand: GetDecryptedIntegrationsCommand) {
    return (
      await this.getDecryptedIntegrationsUsecase.execute(
        GetDecryptedIntegrationsCommand.create(getDecryptedIntegrationsCommand)
      )
    )[0];
  }
}
