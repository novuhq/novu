import { Injectable } from '@nestjs/common';
import {
  MessageRepository,
  NotificationStepEntity,
  NotificationRepository,
  SubscriberEntity,
  SubscriberRepository,
  NotificationEntity,
  MessageEntity,
  IntegrationEntity,
} from '@novu/dal';
import {
  ChannelTypeEnum,
  LogCodeEnum,
  LogStatusEnum,
  PushProviderIdEnum,
  ExecutionDetailsSourceEnum,
  ExecutionDetailsStatusEnum,
  StepTypeEnum,
} from '@novu/shared';
import * as Sentry from '@sentry/node';
import { CreateLog } from '../../../logs/usecases/create-log/create-log.usecase';
import { CreateLogCommand } from '../../../logs/usecases/create-log/create-log.command';
import { PushFactory } from '../../services/push-service/push.factory';
import { SendMessageCommand } from './send-message.command';
import { SendMessageType } from './send-message-type.usecase';
import { CompileTemplate } from '../../../content-templates/usecases/compile-template/compile-template.usecase';
import { CompileTemplateCommand } from '../../../content-templates/usecases/compile-template/compile-template.command';
import {
  GetDecryptedIntegrations,
  GetDecryptedIntegrationsCommand,
} from '../../../integrations/usecases/get-decrypted-integrations';
import { CreateExecutionDetails } from '../../../execution-details/usecases/create-execution-details/create-execution-details.usecase';
import {
  CreateExecutionDetailsCommand,
  DetailEnum,
} from '../../../execution-details/usecases/create-execution-details/create-execution-details.command';

@Injectable()
export class SendMessagePush extends SendMessageType {
  private pushFactory = new PushFactory();

  constructor(
    private subscriberRepository: SubscriberRepository,
    private notificationRepository: NotificationRepository,
    protected messageRepository: MessageRepository,
    protected createLogUsecase: CreateLog,
    protected createExecutionDetails: CreateExecutionDetails,
    private compileTemplate: CompileTemplate,
    private getDecryptedIntegrationsUsecase: GetDecryptedIntegrations
  ) {
    super(messageRepository, createLogUsecase, createExecutionDetails);
  }

  public async execute(command: SendMessageCommand) {
    Sentry.addBreadcrumb({
      message: 'Sending Push',
    });

    const pushChannel: NotificationStepEntity = command.step;
    const notification = await this.notificationRepository.findById(command.notificationId);
    const subscriber: SubscriberEntity = await this.subscriberRepository.findOne({
      _environmentId: command.environmentId,
      _id: command.subscriberId,
    });

    const data = {
      subscriber,
      step: {
        digest: !!command.events.length,
        events: command.events,
        total_count: command.events.length,
      },
      ...command.payload,
    };
    let content = '';
    let title = '';

    try {
      content = await this.compileTemplate.execute(
        CompileTemplateCommand.create({
          templateId: 'custom',
          customTemplate: pushChannel.template.content as string,
          data,
        })
      );

      title = await this.compileTemplate.execute(
        CompileTemplateCommand.create({
          templateId: 'custom',
          customTemplate: pushChannel.template.title as string,
          data,
        })
      );
    } catch (e) {
      await this.createExecutionDetails.execute(
        CreateExecutionDetailsCommand.create({
          ...CreateExecutionDetailsCommand.getDetailsFromJob(command.job),
          detail: DetailEnum.MESSAGE_CONTENT_NOT_GENERATED,
          source: ExecutionDetailsSourceEnum.INTERNAL,
          status: ExecutionDetailsStatusEnum.FAILED,
          isTest: false,
          isRetry: false,
          raw: JSON.stringify(data),
        })
      );

      return;
    }

    const integration = (
      await this.getDecryptedIntegrationsUsecase.execute(
        GetDecryptedIntegrationsCommand.create({
          organizationId: command.organizationId,
          environmentId: command.environmentId,
          channelType: ChannelTypeEnum.PUSH,
          findOne: true,
          active: true,
        })
      )
    )[0];

    if (!integration) {
      await this.createExecutionDetails.execute(
        CreateExecutionDetailsCommand.create({
          ...CreateExecutionDetailsCommand.getDetailsFromJob(command.job),
          detail: DetailEnum.SUBSCRIBER_NO_ACTIVE_INTEGRATION,
          source: ExecutionDetailsSourceEnum.INTERNAL,
          status: ExecutionDetailsStatusEnum.FAILED,
          isTest: false,
          isRetry: false,
        })
      );

      return;
    }

    const overrides = command.overrides[integration.providerId] || {};
    const pushChannels = subscriber.channels.filter((chan) =>
      Object.values(PushProviderIdEnum).includes(chan.providerId as PushProviderIdEnum)
    );

    const messagePayload = Object.assign({}, command.payload);
    delete messagePayload.attachments;

    if (integration) {
      if (pushChannels.length === 0) {
        await this.createExecutionDetails.execute(
          CreateExecutionDetailsCommand.create({
            ...CreateExecutionDetailsCommand.getDetailsFromJob(command.job),
            detail: DetailEnum.SUBSCRIBER_NO_ACTIVE_CHANNEL,
            source: ExecutionDetailsSourceEnum.INTERNAL,
            status: ExecutionDetailsStatusEnum.FAILED,
            isTest: false,
            isRetry: false,
          })
        );

        return;
      }

      for (const channel of pushChannels) {
        if (!channel.credentials?.deviceTokens) {
          await this.createExecutionDetails.execute(
            CreateExecutionDetailsCommand.create({
              ...CreateExecutionDetailsCommand.getDetailsFromJob(command.job),
              detail: DetailEnum.PUSH_MISSING_DEVICE_TOKENS,
              source: ExecutionDetailsSourceEnum.INTERNAL,
              status: ExecutionDetailsStatusEnum.FAILED,
              isTest: false,
              isRetry: false,
            })
          );

          continue;
        }

        await this.sendMessage(
          integration,
          channel.credentials.deviceTokens,
          title,
          content,
          command,
          notification,
          command.payload,
          overrides,
          channel.providerId
        );
      }

      return;
    }

    await this.sendErrors(pushChannels, command, notification, integration);
  }

  private async sendErrors(
    pushChannels,
    command: SendMessageCommand,
    notification: NotificationEntity,
    integration: IntegrationEntity
  ) {
    if (!pushChannels) {
      await this.createLogUsecase.execute(
        CreateLogCommand.create({
          transactionId: command.transactionId,
          status: LogStatusEnum.ERROR,
          environmentId: command.environmentId,
          organizationId: command.organizationId,
          text: 'Subscriber does not have active channel',
          userId: command.userId,
          subscriberId: command.subscriberId,
          code: LogCodeEnum.SUBSCRIBER_MISSING_PUSH,
          templateId: notification._templateId,
          raw: {
            payload: command.payload,
            triggerIdentifier: command.identifier,
          },
        })
      );

      await this.createExecutionDetails.execute(
        CreateExecutionDetailsCommand.create({
          ...CreateExecutionDetailsCommand.getDetailsFromJob(command.job),
          detail: DetailEnum.SUBSCRIBER_NO_ACTIVE_CHANNEL,
          source: ExecutionDetailsSourceEnum.INTERNAL,
          status: ExecutionDetailsStatusEnum.FAILED,
          isTest: false,
          isRetry: false,
        })
      );

      return;
    }
  }

  private async sendMessage(
    integration: IntegrationEntity,
    target: string[],
    title: string,
    content: string,
    command: SendMessageCommand,
    notification: NotificationEntity,
    payload: object,
    overrides: object,
    providerId: string
  ) {
    const message: MessageEntity = await this.messageRepository.create({
      _notificationId: notification._id,
      _environmentId: command.environmentId,
      _organizationId: command.organizationId,
      _subscriberId: command.subscriberId,
      _templateId: notification._templateId,
      _messageTemplateId: command.step.template._id,
      channel: ChannelTypeEnum.PUSH,
      transactionId: command.transactionId,
      deviceTokens: target,
      content,
      title,
      payload: payload as never,
      overrides: overrides as never,
      providerId,
      _jobId: command.jobId,
    });

    await this.createExecutionDetails.execute(
      CreateExecutionDetailsCommand.create({
        ...CreateExecutionDetailsCommand.getDetailsFromJob(command.job),
        detail: DetailEnum.MESSAGE_CREATED,
        source: ExecutionDetailsSourceEnum.INTERNAL,
        status: ExecutionDetailsStatusEnum.PENDING,
        messageId: message._id,
        isTest: false,
        isRetry: false,
        raw: JSON.stringify(content),
      })
    );

    try {
      const pushHandler = this.pushFactory.getHandler(integration);
      const result = await pushHandler.send({
        target: (overrides as { deviceTokens?: string[] }).deviceTokens || target,
        title,
        content,
        payload,
        overrides,
      });

      await this.createExecutionDetails.execute(
        CreateExecutionDetailsCommand.create({
          ...CreateExecutionDetailsCommand.getDetailsFromJob(command.job),
          messageId: message._id,
          detail: DetailEnum.MESSAGE_SENT,
          source: ExecutionDetailsSourceEnum.INTERNAL,
          status: ExecutionDetailsStatusEnum.SUCCESS,
          isTest: false,
          isRetry: false,
          raw: JSON.stringify(result),
        })
      );
    } catch (e) {
      await this.sendErrorStatus(
        message,
        'error',
        'unexpected_push_error',
        e.message || e.name || 'Un-expect Push provider error',
        command,
        notification,
        LogCodeEnum.PUSH_ERROR,
        e
      );

      await this.createExecutionDetails.execute(
        CreateExecutionDetailsCommand.create({
          ...CreateExecutionDetailsCommand.getDetailsFromJob(command.job),
          messageId: message._id,
          detail: DetailEnum.PROVIDER_ERROR,
          source: ExecutionDetailsSourceEnum.INTERNAL,
          status: ExecutionDetailsStatusEnum.FAILED,
          isTest: false,
          isRetry: false,
          raw: JSON.stringify(e),
        })
      );

      return;
    }
  }
}
