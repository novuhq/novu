import { IntegrationEntity, JobEntity, MessageRepository, SubscriberRepository } from '@novu/dal';
import {
  ChannelTypeEnum,
  EmailProviderIdEnum,
  ExecutionDetailsSourceEnum,
  ExecutionDetailsStatusEnum,
  SmsProviderIdEnum,
} from '@novu/shared';
import {
  buildSubscriberKey,
  CachedEntity,
  DetailEnum,
  CreateExecutionDetails,
  CreateExecutionDetailsCommand,
  SelectIntegration,
  SelectIntegrationCommand,
  GetNovuProviderCredentials,
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
    protected selectIntegration: SelectIntegration,
    protected getNovuProviderCredentials: GetNovuProviderCredentials
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

  protected async getIntegration(
    selectIntegrationCommand: SelectIntegrationCommand
  ): Promise<IntegrationEntity | undefined> {
    const integration = await this.selectIntegration.execute(SelectIntegrationCommand.create(selectIntegrationCommand));

    if (!integration) {
      return;
    }

    if (integration.providerId === EmailProviderIdEnum.Novu || integration.providerId === SmsProviderIdEnum.Novu) {
      integration.credentials = await this.getNovuProviderCredentials.execute({
        channelType: integration.channel,
        providerId: integration.providerId,
        environmentId: integration._environmentId,
        organizationId: integration._organizationId,
        userId: selectIntegrationCommand.userId,
      });
    }

    return integration;
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

  protected async sendSelectedIntegrationExecution(job: JobEntity, integration: IntegrationEntity) {
    await this.createExecutionDetails.execute(
      CreateExecutionDetailsCommand.create({
        ...CreateExecutionDetailsCommand.getDetailsFromJob(job),
        detail: DetailEnum.INTEGRATION_INSTANCE_SELECTED,
        source: ExecutionDetailsSourceEnum.INTERNAL,
        status: ExecutionDetailsStatusEnum.PENDING,
        isTest: false,
        isRetry: false,
        raw: JSON.stringify({
          providerId: integration?.providerId,
          identifier: integration?.identifier,
          name: integration?.name,
          _environmentId: integration?._environmentId,
          _id: integration?._id,
        }),
      })
    );
  }
}
