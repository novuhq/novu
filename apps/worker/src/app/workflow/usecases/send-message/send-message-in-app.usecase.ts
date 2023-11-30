import { Injectable } from '@nestjs/common';
import * as Sentry from '@sentry/node';
import {
  MessageRepository,
  NotificationStepEntity,
  SubscriberRepository,
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
  ActorTypeEnum,
  WebSocketEventEnum,
} from '@novu/shared';
import {
  InstrumentUsecase,
  InvalidateCacheService,
  DetailEnum,
  CreateExecutionDetailsCommand,
  SelectIntegration,
  CompileTemplate,
  CompileTemplateCommand,
  WebSocketsQueueService,
  buildFeedKey,
  buildMessageCountKey,
  GetNovuProviderCredentials,
  SelectVariant,
  ExecutionLogQueueService,
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
    protected executionLogQueueService: ExecutionLogQueueService,
    protected subscriberRepository: SubscriberRepository,
    private compileTemplate: CompileTemplate,
    private organizationRepository: OrganizationRepository,
    protected selectIntegration: SelectIntegration,
    protected getNovuProviderCredentials: GetNovuProviderCredentials,
    protected selectVariant: SelectVariant
  ) {
    super(
      messageRepository,
      createLogUsecase,
      executionLogQueueService,
      subscriberRepository,
      selectIntegration,
      getNovuProviderCredentials,
      selectVariant
    );
  }

  @InstrumentUsecase()
  public async execute(command: SendMessageCommand) {
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
      const metadata = CreateExecutionDetailsCommand.getExecutionLogMetadata();
      await this.executionLogQueueService.add(
        metadata._id,
        CreateExecutionDetailsCommand.create({
          ...metadata,
          ...CreateExecutionDetailsCommand.getDetailsFromJob(command.job),
          detail: DetailEnum.SUBSCRIBER_NO_ACTIVE_INTEGRATION,
          source: ExecutionDetailsSourceEnum.INTERNAL,
          status: ExecutionDetailsStatusEnum.FAILED,
          isTest: false,
          isRetry: false,
        }),
        command.organizationId
      );

      return;
    }

    const step: NotificationStepEntity = command.step;
    if (!step.template) throw new PlatformException('Template not found');

    let content = '';

    const { actor } = command.step.template;

    const [template, organization] = await Promise.all([
      this.processVariants(command),
      this.organizationRepository.findOne({ _id: command.organizationId }, 'branding'),
    ]);

    if (template) {
      step.template = template;
    }

    try {
      content = await this.compileInAppTemplate(step.template.content, command.compileContext, organization);

      if (step.template.cta?.data?.url) {
        step.template.cta.data.url = await this.compileInAppTemplate(
          step.template.cta?.data?.url,
          command.compileContext,
          organization
        );
      }

      if (step.template.cta?.action?.buttons) {
        const ctaButtons: IMessageButton[] = [];

        for (const action of step.template.cta.action.buttons) {
          const buttonContent = await this.compileInAppTemplate(action.content, command.compileContext, organization);
          ctaButtons.push({ type: action.type, content: buttonContent });
        }

        step.template.cta.action.buttons = ctaButtons;
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
      _messageTemplateId: step.template._id,
      channel: ChannelTypeEnum.IN_APP,
      transactionId: command.transactionId,
      providerId: integration.providerId,
      _feedId: step.template._feedId,
    });

    let message: MessageEntity | null = null;

    await this.invalidateCache.invalidateQuery({
      key: buildFeedKey().invalidate({
        subscriberId: command.subscriberId,
        _environmentId: command.environmentId,
      }),
    });

    await this.invalidateCache.invalidateQuery({
      key: buildMessageCountKey().invalidate({
        subscriberId: command.subscriberId,
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
        _messageTemplateId: step.template._id,
        channel: ChannelTypeEnum.IN_APP,
        cta: step.template.cta,
        _feedId: step.template._feedId,
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
            cta: step.template.cta,
            content,
            payload: messagePayload,
            createdAt: new Date(),
          },
        }
      );
      message = await this.messageRepository.findOne({ _id: oldMessage._id, _environmentId: command.environmentId });
    }

    if (!message) throw new PlatformException('Message not found');

    const metadata = CreateExecutionDetailsCommand.getExecutionLogMetadata();
    await this.executionLogQueueService.add(
      metadata._id,
      CreateExecutionDetailsCommand.create({
        ...CreateExecutionDetailsCommand.getDetailsFromJob(command.job),
        ...metadata,
        messageId: message._id,
        providerId: integration.providerId,
        detail: DetailEnum.MESSAGE_CREATED,
        source: ExecutionDetailsSourceEnum.INTERNAL,
        status: ExecutionDetailsStatusEnum.PENDING,
        isTest: false,
        isRetry: false,
      }),
      command.organizationId
    );

    await this.webSocketsQueueService.bullMqService.add(
      'sendMessage',
      {
        event: WebSocketEventEnum.RECEIVED,
        userId: command._subscriberId,
        _environmentId: command.environmentId,
        payload: {
          messageId: message._id,
        },
      },
      {
        removeOnComplete: true,
        removeOnFail: true,
      },
      command.organizationId
    );

    const meta = CreateExecutionDetailsCommand.getExecutionLogMetadata();
    await this.executionLogQueueService.add(
      meta._id,
      CreateExecutionDetailsCommand.create({
        ...meta,
        ...CreateExecutionDetailsCommand.getDetailsFromJob(command.job),
        messageId: message._id,
        providerId: integration.providerId,
        detail: DetailEnum.MESSAGE_SENT,
        source: ExecutionDetailsSourceEnum.INTERNAL,
        status: ExecutionDetailsStatusEnum.SUCCESS,
        isTest: false,
        isRetry: false,
      }),
      command.organizationId
    );
  }

  private async compileInAppTemplate(
    content: string | IEmailBlock[],
    payload: any,
    organization: OrganizationEntity | null
  ): Promise<string> {
    return await this.compileTemplate.execute(
      CompileTemplateCommand.create({
        template: content as string,
        data: {
          ...this.getCompilePayload(payload),
          branding: { logo: organization?.branding?.logo, color: organization?.branding?.color || '#f47373' },
        },
      })
    );
  }
}
