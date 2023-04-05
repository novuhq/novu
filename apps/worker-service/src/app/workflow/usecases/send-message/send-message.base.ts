import { JobEntity, MessageRepository, SubscriberRepository } from '@novu/dal';
import { ChannelTypeEnum, ExecutionDetailsSourceEnum, ExecutionDetailsStatusEnum } from '@novu/shared';
import {
  buildSubscriberKey,
  buildIntegrationKey,
  CachedEntity,
  CachedQuery,
  DetailEnum,
  CreateExecutionDetails,
  CreateExecutionDetailsCommand,
  GetDecryptedIntegrations,
  GetDecryptedIntegrationsCommand,
} from '@novu/application-generic';

import { SendMessageType } from './send-message-type.usecase';
import { CreateLog } from '../../../shared/logs';

export abstract class SendMessageBase extends SendMessageType {
  abstract readonly channelType: ChannelTypeEnum;
  protected constructor(
    protected messageRepository: MessageRepository,
    protected createLogUsecase: CreateLog,
    protected createExecutionDetails: CreateExecutionDetails,
    protected subscriberRepository: SubscriberRepository,
    protected getDecryptedIntegrationsUsecase: GetDecryptedIntegrations
  ) {
    super(messageRepository, createLogUsecase, createExecutionDetails);
  }

  @CachedEntity({
    builder: (command: { subscriberId: string; _environmentId: string }) =>
      buildSubscriberKey({
        _environmentId: command._environmentId,
        subscriberId: command.subscriberId,
      }),
  })
  protected async getSubscriberBySubscriberId({
    subscriberId,
    _environmentId,
  }: {
    subscriberId: string;
    _environmentId: string;
  }) {
    return await this.subscriberRepository.findOne({
      _environmentId,
      subscriberId,
    });
  }

  @CachedQuery({
    builder: ({ environmentId, ...command }: GetDecryptedIntegrationsCommand) =>
      buildIntegrationKey().cache({
        _environmentId: environmentId,
        ...command,
      }),
  })
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

  protected async sendErrorHandlebars(job: JobEntity, error: string) {
    await this.createExecutionDetails.execute(
      CreateExecutionDetailsCommand.create({
        ...CreateExecutionDetailsCommand.getDetailsFromJob(job),
        detail: DetailEnum.MESSAGE_CONTENT_NOT_GENERATED,
        source: ExecutionDetailsSourceEnum.INTERNAL,
        status: ExecutionDetailsStatusEnum.FAILED,
        isTest: false,
        isRetry: false,
        raw: JSON.stringify({ error }),
      })
    );
  }
}
