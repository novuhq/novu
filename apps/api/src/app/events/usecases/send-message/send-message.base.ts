import { SendMessageType } from './send-message-type.usecase';
import { MessageRepository, SubscriberRepository } from '@novu/dal';
import { CreateLog } from '../../../logs/usecases/create-log/create-log.usecase';
import { CreateExecutionDetails } from '../../../execution-details/usecases/create-execution-details/create-execution-details.usecase';
import { Cached } from '../../../shared/interceptors';
import { CacheKeyPrefixEnum } from '../../../shared/services/cache';
import {
  GetDecryptedIntegrations,
  GetDecryptedIntegrationsCommand,
} from '../../../integrations/usecases/get-decrypted-integrations';
import { ChannelTypeEnum } from '@novu/shared';

export abstract class SendMessageBase extends SendMessageType {
  abstract readonly channelType: ChannelTypeEnum;
  protected constructor(
    protected messageRepository: MessageRepository,
    protected createLogUsecase: CreateLog,
    protected createExecutionDetails: CreateExecutionDetails,
    protected subscriberRepository: SubscriberRepository,
    protected getDecryptedIntegrationsUsecase?: GetDecryptedIntegrations
  ) {
    super(messageRepository, createLogUsecase, createExecutionDetails);
  }

  @Cached(CacheKeyPrefixEnum.SUBSCRIBER)
  protected async getSubscriber({ _id, environmentId }: { _id: string; environmentId: string }) {
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
  protected storeContent(): boolean {
    return this.channelType === ChannelTypeEnum.IN_APP || process.env.STORE_NOTIFICATION_CONTENT === 'true';
  }
}
