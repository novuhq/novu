import { Injectable } from '@nestjs/common';
import * as Sentry from '@sentry/node';
import { ModuleRef } from '@nestjs/core';

import { MessageRepository, NotificationStepEntity, SubscriberRepository, MessageEntity } from '@novu/dal';
import {
  ChannelTypeEnum,
  ExecutionDetailsSourceEnum,
  ExecutionDetailsStatusEnum,
  ActorTypeEnum,
  WebSocketEventEnum,
} from '@novu/shared';
import {
  InstrumentUsecase,
  InvalidateCacheService,
  DetailEnum,
  SelectIntegration,
  buildFeedKey,
  buildMessageCountKey,
  GetNovuProviderCredentials,
  SelectVariant,
  CompileInAppTemplate,
  CompileInAppTemplateCommand,
  WebSocketsQueueService,
  ExecutionLogRoute,
  ExecutionLogRouteCommand,
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
    protected executionLogRoute: ExecutionLogRoute,
    protected subscriberRepository: SubscriberRepository,
    protected selectIntegration: SelectIntegration,
    protected getNovuProviderCredentials: GetNovuProviderCredentials,
    protected selectVariant: SelectVariant,
    protected moduleRef: ModuleRef,
    protected compileInAppTemplate: CompileInAppTemplate
  ) {
    super(
      messageRepository,
      createLogUsecase,
      executionLogRoute,
      subscriberRepository,
      selectIntegration,
      getNovuProviderCredentials,
      selectVariant,
      moduleRef
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
      await this.executionLogRoute.execute(
        ExecutionLogRouteCommand.create({
          ...ExecutionLogRouteCommand.getDetailsFromJob(command.job),
          detail: DetailEnum.SUBSCRIBER_NO_ACTIVE_INTEGRATION,
          source: ExecutionDetailsSourceEnum.INTERNAL,
          status: ExecutionDetailsStatusEnum.FAILED,
          isTest: false,
          isRetry: false,
        })
      );

      return;
    }

    const step: NotificationStepEntity = command.step;
    if (!step.template) throw new PlatformException('Template not found');

    let content = '';

    const { actor } = command.step.template;

    const template = await this.processVariants(command);

    if (template) {
      step.template = template;
    }

    try {
      if (!command.chimeraData) {
        const compiled = await this.compileInAppTemplate.execute(
          CompileInAppTemplateCommand.create({
            organizationId: command.organizationId,
            environmentId: command.environmentId,
            payload: this.getCompilePayload(command.compileContext),
            content: step.template.content as string,
            cta: step.template.cta,
            userId: command.userId,
          }),
          this.initiateTranslations.bind(this)
        );
        content = compiled.content;

        if (step.template.cta?.data?.url) {
          step.template.cta.data.url = compiled.url;
        }

        if (step.template.cta?.action?.buttons) {
          step.template.cta.action.buttons = compiled.ctaButtons;
        }
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

    const chimeraBody = command.chimeraData?.outputs.body;

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
        content: this.storeContent() ? chimeraBody || content : null,
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

    await this.executionLogRoute.execute(
      ExecutionLogRouteCommand.create({
        ...ExecutionLogRouteCommand.getDetailsFromJob(command.job),
        messageId: message._id,
        providerId: integration.providerId,
        detail: DetailEnum.MESSAGE_CREATED,
        source: ExecutionDetailsSourceEnum.INTERNAL,
        status: ExecutionDetailsStatusEnum.PENDING,
        isTest: false,
        isRetry: false,
      })
    );

    await this.webSocketsQueueService.add({
      name: 'sendMessage',
      data: {
        event: WebSocketEventEnum.RECEIVED,
        userId: command._subscriberId,
        _environmentId: command.environmentId,
        payload: {
          messageId: message._id,
        },
      },
      options: {
        removeOnComplete: true,
        removeOnFail: true,
      },
      groupId: command.organizationId,
    });

    await this.executionLogRoute.execute(
      ExecutionLogRouteCommand.create({
        ...ExecutionLogRouteCommand.getDetailsFromJob(command.job),
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
}
