import { SendMessageType } from './send-message-type.usecase';
import { MessageRepository, SubscriberEntity, SubscriberRepository } from '@novu/dal';
import { CreateLog } from '../../../logs/usecases/create-log/create-log.usecase';
import { CreateExecutionDetails } from '../../../execution-details/usecases/create-execution-details/create-execution-details.usecase';
import { SendMessageCommand } from './send-message.command';
import { Cached } from '../../../shared/interceptors';
import { CacheKeyPrefixEnum } from '../../../shared/services/cache';

export abstract class SendMessageBase extends SendMessageType {
  protected subscriber: SubscriberEntity;
  protected constructor(
    protected messageRepository: MessageRepository,
    protected createLogUsecase: CreateLog,
    protected createExecutionDetails: CreateExecutionDetails,
    protected subscriberRepository: SubscriberRepository
  ) {
    super(messageRepository, createLogUsecase, createExecutionDetails);
  }

  protected async initialize(command: SendMessageCommand) {
    this.subscriber = await this.getSubscriber({
      environmentId: command.environmentId,
      _id: command.subscriberId,
    });
  }

  @Cached(CacheKeyPrefixEnum.SUBSCRIBER)
  private async getSubscriber({ _id, environmentId }: { _id: string; environmentId: string }) {
    return await this.subscriberRepository.findOne({
      _environmentId: environmentId,
      _id: _id,
    });
  }
}
