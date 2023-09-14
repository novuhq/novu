import { Injectable } from '@nestjs/common';
import * as Sentry from '@sentry/node';
import {
  MessageRepository,
  NotificationStepEntity,
  SubscriberRepository,
  SubscriberEntity,
  MessageEntity,
  OrganizationRepository,
  OrganizationEntity,
  TenantRepository,
  TenantEntity,
} from '@novu/dal';
import {
  ChannelTypeEnum,
  IMessageButton,
  ExecutionDetailsSourceEnum,
  ExecutionDetailsStatusEnum,
  IEmailBlock,
  ActorTypeEnum,
  WebSocketEventEnum,
} from '@novu/shared';
import {
  InstrumentUsecase,
  InvalidateCacheService,
  DetailEnum,
  CreateExecutionDetails,
  CreateExecutionDetailsCommand,
  SelectIntegration,
  CompileTemplate,
  CompileTemplateCommand,
  WebSocketsQueueService,
  buildFeedKey,
  buildMessageCountKey,
  GetNovuProviderCredentials,
} from '@novu/application-generic';

import { CreateLog } from '../../../shared/logs';
import { SendMessageCommand } from './send-message.command';
import { SendMessageBase } from './send-message.base';
import { PlatformException } from '../../../shared/utils';

@Injectable()
export class SendMessageInApp extends SendMessageBase {
  channelType = ChannelTypeEnum.IN_APP;

  constructor(
    private invalidateCache: InvalidateCacheService,
    protected messageRepository: MessageRepository,
    private webSocketsQueueService: WebSocketsQueueService,
    protected createLogUsecase: CreateLog,
    protected createExecutionDetails: CreateExecutionDetails,
    protected subscriberRepository: SubscriberRepository,
    protected tenantRepository: TenantRepository,
    private compileTemplate: CompileTemplate,
    private organizationRepository: OrganizationRepository,
    protected selectIntegration: SelectIntegration,
    protected getNovuProviderCredentials: GetNovuProviderCredentials
  ) {
    super(
      messageRepository,
      createLogUsecase,
      createExecutionDetails,
      subscriberRepository,
      tenantRepository,
      selectIntegration,
      getNovuProviderCredentials
    );
  }

  @InstrumentUsecase()
  public async execute(command: SendMessageCommand) {
    const subscriber = await this.getSubscriberBySubscriberId({
      subscriberId: command.subscriberId,
      _environmentId: command.environmentId,
    });
    if (!subscriber) throw new PlatformException('Subscriber not found');
    if (!command.step.template) throw new PlatformException('Template not found');

    Sentry.addBreadcrumb({
      message: 'Sending In App',
    });

    const integration = await this.getIntegration({
      organizationId: command.organizationId,
      environmentId: command.environmentId,
      channelType: ChannelTypeEnum.IN_APP,
      userId: command.userId,
      filterData: {
        tenant: command.job.tenant,
      },
    });

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

    const inAppChannel: NotificationStepEntity = command.step;
    if (!inAppChannel.template) throw new PlatformException('Template not found');

    let content = '';

    const { actor } = command.step.template;

    const [tenant, organization] = await Promise.all([
      this.handleTenantExecution(command.job),
      this.organizationRepository.findById(command.organizationId, 'branding'),
    ]);

    try {
      content = await this.compileInAppTemplate(
        inAppChannel.template.content,
        command.payload,
        subscriber,
        command,
        organization,
        tenant
      );

      if (inAppChannel.template.cta?.data?.url) {
        inAppChannel.template.cta.data.url = await this.compileInAppTemplate(
          inAppChannel.template.cta?.data?.url,
          command.payload,
          subscriber,
          command,
          organization,
          tenant
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
            organization,
            tenant
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
      _notificationId: command.notificationId,
      _environmentId: command.environmentId,
      _subscriberId: command._subscriberId,
      _templateId: command._templateId,
      _messageTemplateId: inAppChannel.template._id,
      channel: ChannelTypeEnum.IN_APP,
      transactionId: command.transactionId,
      providerId: integration.providerId,
      _feedId: inAppChannel.template._feedId,
    });

    let message: MessageEntity | null = null;

    await this.invalidateCache.invalidateQuery({
      key: buildFeedKey().invalidate({
        subscriberId: subscriber.subscriberId,
        _environmentId: command.environmentId,
      }),
    });

    await this.invalidateCache.invalidateQuery({
      key: buildMessageCountKey().invalidate({
        subscriberId: subscriber.subscriberId,
        _environmentId: command.environmentId,
      }),
    });

    if (!oldMessage) {
      message = await this.messageRepository.create({
        _notificationId: command.notificationId,
        _environmentId: command.environmentId,
        _organizationId: command.organizationId,
        _subscriberId: command._subscriberId,
        _templateId: command._templateId,
        _messageTemplateId: inAppChannel.template._id,
        channel: ChannelTypeEnum.IN_APP,
        cta: inAppChannel.template.cta,
        _feedId: inAppChannel.template._feedId,
        transactionId: command.transactionId,
        content: this.storeContent() ? content : null,
        payload: messagePayload,
        providerId: integration.providerId,
        templateIdentifier: command.identifier,
        _jobId: command.jobId,
        ...(actor &&
          actor.type !== ActorTypeEnum.NONE && {
            actor,
            _actorId: command.job?._actorId,
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

    if (!message) throw new PlatformException('Message not found');

    await this.createExecutionDetails.execute(
      CreateExecutionDetailsCommand.create({
        ...CreateExecutionDetailsCommand.getDetailsFromJob(command.job),
        messageId: message._id,
        providerId: integration.providerId,
        detail: DetailEnum.MESSAGE_CREATED,
        source: ExecutionDetailsSourceEnum.INTERNAL,
        status: ExecutionDetailsStatusEnum.PENDING,
        isTest: false,
        isRetry: false,
      })
    );

    await this.webSocketsQueueService.bullMqService.add(
      'sendMessage-received-' + message._id,
      {
        event: WebSocketEventEnum.RECEIVED,
        userId: command._subscriberId,
        payload: {
          message,
        },
      },
      {},
      command.organizationId
    );

    await this.webSocketsQueueService.bullMqService.add(
      'sendMessage-unseen-' + message._id,
      {
        event: WebSocketEventEnum.UNSEEN,
        userId: command._subscriberId,
        _environmentId: command.environmentId,
      },
      {},
      command.organizationId
    );

    await this.webSocketsQueueService.bullMqService.add(
      'sendMessage-unread-' + message._id,
      {
        event: WebSocketEventEnum.UNREAD,
        userId: command._subscriberId,
        _environmentId: command.environmentId,
      },
      {},
      command.organizationId
    );

    await this.createExecutionDetails.execute(
      CreateExecutionDetailsCommand.create({
        ...CreateExecutionDetailsCommand.getDetailsFromJob(command.job),
        messageId: message._id,
        providerId: integration.providerId,
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
    organization: OrganizationEntity | null,
    tenant: TenantEntity | null
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
          ...(tenant && { tenant }),
          ...payload,
        },
      })
    );
  }
}
