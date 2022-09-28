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
import { ChannelTypeEnum, LogCodeEnum, LogStatusEnum, PushProviderIdEnum } from '@novu/shared';
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

@Injectable()
export class SendMessagePush extends SendMessageType {
  private pushFactory = new PushFactory();

  constructor(
    private subscriberRepository: SubscriberRepository,
    private notificationRepository: NotificationRepository,
    protected messageRepository: MessageRepository,
    protected createLogUsecase: CreateLog,
    private compileTemplate: CompileTemplate,
    private getDecryptedIntegrationsUsecase: GetDecryptedIntegrations
  ) {
    super(messageRepository, createLogUsecase);
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

    const content = await this.compileTemplate.execute(
      CompileTemplateCommand.create({
        templateId: 'custom',
        customTemplate: pushChannel.template.content as string,
        data: {
          subscriber,
          step: {
            digest: !!command.events.length,
            events: command.events,
            total_count: command.events.length,
          },
          ...command.payload,
        },
      })
    );

    const title = await this.compileTemplate.execute(
      CompileTemplateCommand.create({
        templateId: 'custom',
        customTemplate: pushChannel.template.title as string,
        data: {
          subscriber,
          step: {
            digest: !!command.events.length,
            events: command.events,
            total_count: command.events.length,
          },
          ...command.payload,
        },
      })
    );
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

    const overrides = command.overrides[integration.providerId] || {};
    const pushChannels = subscriber.channels.filter((chan) =>
      Object.values(PushProviderIdEnum).includes(chan.providerId as PushProviderIdEnum)
    );

    const messagePayload = Object.assign({}, command.payload);
    delete messagePayload.attachments;

    if (integration) {
      for (const channel of pushChannels) {
        if (!channel.credentials.deviceTokens) continue;
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

    await this.sendErrors(pushChannels, command, notification);
  }

  private async sendErrors(pushChannels, command: SendMessageCommand, notification: NotificationEntity) {
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
    });

    try {
      const pushHandler = this.pushFactory.getHandler(integration);
      await pushHandler.send({
        target: (overrides as { deviceTokens?: string[] }).deviceTokens || target,
        title,
        content,
        payload,
        overrides,
      });
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
    }
  }
}
