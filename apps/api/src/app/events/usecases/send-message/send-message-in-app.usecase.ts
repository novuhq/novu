import { Injectable } from '@nestjs/common';
import * as Sentry from '@sentry/node';
import {
  MessageRepository,
  NotificationStepEntity,
  NotificationRepository,
  SubscriberRepository,
  SubscriberEntity,
  MessageEntity,
  OrganizationRepository,
  OrganizationEntity,
} from '@novu/dal';
import {
  ChannelTypeEnum,
  IMessageButton,
  ExecutionDetailsSourceEnum,
  ExecutionDetailsStatusEnum,
  IEmailBlock,
  InAppProviderIdEnum,
  ActorTypeEnum,
  IActor,
} from '@novu/shared';

import { CreateLog } from '../../../logs/usecases/create-log/create-log.usecase';
import { QueueService } from '../../../shared/services/queue';
import { SendMessageCommand } from './send-message.command';
import { CompileTemplate, CompileTemplateCommand } from '../../../content-templates/usecases';
import { CreateExecutionDetails } from '../../../execution-details/usecases/create-execution-details/create-execution-details.usecase';
import {
  CreateExecutionDetailsCommand,
  DetailEnum,
} from '../../../execution-details/usecases/create-execution-details/create-execution-details.command';
import { CacheKeyPrefixEnum, InvalidateCacheService } from '../../../shared/services/cache';
import { SendMessageBase } from './send-message.base';
import { ApiException } from '../../../shared/exceptions/api.exception';
import { GetDecryptedIntegrations } from '../../../integrations/usecases/get-decrypted-integrations';

@Injectable()
export class SendMessageInApp extends SendMessageBase {
  channelType = ChannelTypeEnum.IN_APP;

  constructor(
    private invalidateCache: InvalidateCacheService,
    private notificationRepository: NotificationRepository,
    protected messageRepository: MessageRepository,
    private queueService: QueueService,
    protected createLogUsecase: CreateLog,
    protected createExecutionDetails: CreateExecutionDetails,
    protected subscriberRepository: SubscriberRepository,
    private compileTemplate: CompileTemplate,
    private organizationRepository: OrganizationRepository,
    protected getDecryptedIntegrationsUsecase: GetDecryptedIntegrations
  ) {
    super(
      messageRepository,
      createLogUsecase,
      createExecutionDetails,
      subscriberRepository,
      getDecryptedIntegrationsUsecase
    );
  }

  public async execute(command: SendMessageCommand) {
    const subscriber = await this.getSubscriber({ _id: command.subscriberId, environmentId: command.environmentId });
    if (!subscriber) throw new ApiException('Subscriber not found');
    if (!command.step.template) throw new ApiException('Template not found');

    Sentry.addBreadcrumb({
      message: 'Sending In App',
    });
    const notification = await this.notificationRepository.findById(command.notificationId);
    if (!notification) throw new ApiException('Notification not found');

    const inAppChannel: NotificationStepEntity = command.step;
    if (!inAppChannel.template) throw new ApiException('Template not found');

    let content = '';

    const { actor } = command.step.template;

    if (actor && actor.type !== ActorTypeEnum.NONE) {
      actor.data = await this.processAvatar(actor, command);
    }

    const organization = await this.organizationRepository.findById(command.organizationId);

    try {
      content = await this.compileInAppTemplate(
        inAppChannel.template.content,
        command.payload,
        subscriber,
        command,
        organization
      );

      if (inAppChannel.template.cta?.data?.url) {
        inAppChannel.template.cta.data.url = await this.compileInAppTemplate(
          inAppChannel.template.cta?.data?.url,
          command.payload,
          subscriber,
          command,
          organization
        );
      }

      if (inAppChannel.template.cta?.action?.buttons) {
        const ctaButtons: IMessageButton[] = [];

        for (const action of inAppChannel.template.cta.action.buttons) {
          const buttonContent = await this.compileInAppTemplate(
            action.content,
            command.payload,
            subscriber,
            command,
            organization
          );
          ctaButtons.push({ type: action.type, content: buttonContent });
        }

        inAppChannel.template.cta.action.buttons = ctaButtons;
      }
    } catch (e) {
      await this.sendErrorHandlebars(command.job, e.message);

      return;
    }

    const messagePayload = Object.assign({}, command.payload);
    delete messagePayload.attachments;

    const oldMessage = await this.messageRepository.findOne({
      _notificationId: notification._id,
      _environmentId: command.environmentId,
      _organizationId: command.organizationId,
      _subscriberId: command.subscriberId,
      _templateId: notification._templateId,
      _messageTemplateId: inAppChannel.template._id,
      channel: ChannelTypeEnum.IN_APP,
      transactionId: command.transactionId,
      providerId: 'novu',
      _feedId: inAppChannel.template._feedId,
    });

    let message: MessageEntity | null = null;

    this.invalidateCache.clearCache({
      storeKeyPrefix: [CacheKeyPrefixEnum.MESSAGE_COUNT, CacheKeyPrefixEnum.FEED],
      credentials: {
        subscriberId: subscriber.subscriberId,
        environmentId: command.environmentId,
      },
    });

    if (!oldMessage) {
      message = await this.messageRepository.create({
        _notificationId: notification._id,
        _environmentId: command.environmentId,
        _organizationId: command.organizationId,
        _subscriberId: command.subscriberId,
        _templateId: notification._templateId,
        _messageTemplateId: inAppChannel.template._id,
        channel: ChannelTypeEnum.IN_APP,
        cta: inAppChannel.template.cta,
        _feedId: inAppChannel.template._feedId,
        transactionId: command.transactionId,
        content: this.storeContent() ? content : null,
        payload: messagePayload,
        templateIdentifier: command.identifier,
        _jobId: command.jobId,
        ...(actor &&
          actor.type !== ActorTypeEnum.NONE && {
            actor,
          }),
      });
    }

    if (oldMessage) {
      await this.messageRepository.update(
        { _environmentId: command.environmentId, _id: oldMessage._id },
        {
          $set: {
            seen: false,
            cta: inAppChannel.template.cta,
            content,
            payload: messagePayload,
            createdAt: new Date(),
          },
        }
      );
      message = await this.messageRepository.findById(oldMessage._id);
    }

    if (!message) throw new ApiException('Message not found');

    await this.queueService.wsSocketQueue.add({
      event: 'notification_received',
      userId: command.subscriberId,
      payload: {
        message,
      },
    });

    const unseenCount = await this.messageRepository.getCount(
      command.environmentId,
      command.subscriberId,
      ChannelTypeEnum.IN_APP,
      { seen: false }
    );

    const unreadCount = await this.messageRepository.getCount(
      command.environmentId,
      command.subscriberId,
      ChannelTypeEnum.IN_APP,
      { read: false }
    );

    await this.createExecutionDetails.execute(
      CreateExecutionDetailsCommand.create({
        ...CreateExecutionDetailsCommand.getDetailsFromJob(command.job),
        messageId: message._id,
        providerId: InAppProviderIdEnum.Novu,
        detail: DetailEnum.MESSAGE_CREATED,
        source: ExecutionDetailsSourceEnum.INTERNAL,
        status: ExecutionDetailsStatusEnum.PENDING,
        isTest: false,
        isRetry: false,
      })
    );

    await this.queueService.wsSocketQueue.add({
      event: 'unseen_count_changed',
      userId: command.subscriberId,
      payload: {
        unseenCount,
      },
    });

    await this.queueService.wsSocketQueue.add({
      event: 'unread_count_changed',
      userId: command.subscriberId,
      payload: {
        unreadCount,
      },
    });

    await this.createExecutionDetails.execute(
      CreateExecutionDetailsCommand.create({
        ...CreateExecutionDetailsCommand.getDetailsFromJob(command.job),
        messageId: message._id,
        providerId: InAppProviderIdEnum.Novu,
        detail: DetailEnum.MESSAGE_SENT,
        source: ExecutionDetailsSourceEnum.INTERNAL,
        status: ExecutionDetailsStatusEnum.SUCCESS,
        isTest: false,
        isRetry: false,
      })
    );
  }

  private async compileInAppTemplate(
    content: string | IEmailBlock[],
    payload: any,
    subscriber: SubscriberEntity,
    command: SendMessageCommand,
    organization: OrganizationEntity | null
  ): Promise<string> {
    return await this.compileTemplate.execute(
      CompileTemplateCommand.create({
        template: content as string,
        data: {
          subscriber,
          step: {
            digest: !!command.events?.length,
            events: command.events,
            total_count: command.events?.length,
          },
          branding: {
            logo: organization?.branding?.logo,
            color: organization?.branding?.color || '#f47373',
          },
          ...payload,
        },
      })
    );
  }

  private async processAvatar(actor: IActor, command: SendMessageCommand): Promise<string | null> {
    const actorId = command.job?._actorId;
    if (actor.type === ActorTypeEnum.USER && actorId) {
      const actorSubscriber: SubscriberEntity | null = await this.subscriberRepository.findOne(
        {
          _environmentId: command.environmentId,
          _id: actorId,
        },
        'avatar'
      );

      return actorSubscriber?.avatar || null;
    }

    return actor.data || null;
  }
}
