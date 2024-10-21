import { Injectable, Logger } from '@nestjs/common';
import { addBreadcrumb } from '@sentry/node';
import { ModuleRef } from '@nestjs/core';

import { MessageRepository, NotificationStepEntity, SubscriberRepository, MessageEntity } from '@novu/dal';
import {
  ChannelTypeEnum,
  ExecutionDetailsSourceEnum,
  ExecutionDetailsStatusEnum,
  ActorTypeEnum,
  WebSocketEventEnum,
  inAppMessageFromBridgeOutputs,
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
import { InAppOutput } from '@novu/framework/internal';

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

    addBreadcrumb({
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

    const { step } = command;
    if (!step.template) throw new PlatformException('Template not found');

    let content = '';

    const { actor } = command.step.template;

    const { subscriber } = command.compileContext;
    const template = await this.processVariants(command);

    if (template) {
      step.template = template;
    }

    try {
      if (!command.bridgeData) {
        const i18nInstance = await this.initiateTranslations(
          command.environmentId,
          command.organizationId,
          subscriber.locale
        );

        const compiled = await this.compileInAppTemplate.execute(
          CompileInAppTemplateCommand.create({
            organizationId: command.organizationId,
            environmentId: command.environmentId,
            payload: this.getCompilePayload(command.compileContext),
            content: step.template.content as string,
            cta: step.template.cta,
            userId: command.userId,
          }),
          i18nInstance
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

    const messagePayload = { ...command.payload };
    delete messagePayload.attachments;

    let oldMessage: MessageEntity | null = null;
    /*
     * Only Stateful Workflows have a _templateId and _messageTemplateId, Stateless Workflows don't.
     * MongoDB will NOT throw an error when query attributes are missing, it will simply ignore them.
     * Therefore it's necessary to check for both before attempting to find the old message, otherwise
     * we risk finding a message that shares the other attributes. This is true for Stateless Workflows
     * that contain multiple in-app steps.
     *
     * Both _templateId and _messageTemplateId are actually required attributes of the MessageEntity,
     * however the `messageRepository` typings are currently incorrect, allowing for any attribute
     * to be passed in untyped.
     *
     * TODO: Fix the repository typings to allow for type-safe attribute access.
     *
     * TODO: After typing fixes, apply an approach that normalizes the _templateId and _messageTemplateId
     * for Stateless and Stateful Workflows to the same attribute, so that we can use a single query to
     * find the old message.
     */
    if (command._templateId && step.template._id) {
      oldMessage = await this.messageRepository.findOne({
        _notificationId: command.notificationId,
        _environmentId: command.environmentId,
        _organizationId: command.organizationId,
        _subscriberId: command._subscriberId,
        _templateId: command._templateId,
        _messageTemplateId: step.template._id,
        templateIdentifier: command.identifier,
        transactionId: command.transactionId,
        providerId: integration.providerId,
        _feedId: step.template._feedId,
        channel: ChannelTypeEnum.IN_APP,
      });
    }

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

    // V2 data
    const bridgeOutputs = command.bridgeData?.outputs as InAppOutput;
    const inAppMessage = inAppMessageFromBridgeOutputs(bridgeOutputs);

    const channelData: Partial<
      Pick<MessageEntity, 'content' | 'subject' | 'avatar' | 'payload' | 'cta' | 'tags' | 'data'>
    > = {
      content: (this.storeContent() ? inAppMessage.content || content : null) as string,
      cta: bridgeOutputs ? inAppMessage.cta : step.template.cta,
      subject: inAppMessage.subject,
      avatar: inAppMessage.avatar,
      payload: messagePayload,
      data: inAppMessage.data,
      tags: command.tags,
    };

    if (!oldMessage) {
      message = await this.messageRepository.create({
        _notificationId: command.notificationId,
        _organizationId: command.organizationId,
        _environmentId: command.environmentId,
        _subscriberId: command._subscriberId,
        _templateId: command._templateId,
        _messageTemplateId: step.template._id,
        templateIdentifier: command.identifier,
        transactionId: command.transactionId,
        providerId: integration.providerId,
        _feedId: step.template._feedId,
        channel: ChannelTypeEnum.IN_APP,
        _jobId: command.jobId,
        ...(actor &&
          actor.type !== ActorTypeEnum.NONE && {
            actor,
            _actorId: command.job?._actorId,
          }),
        ...channelData,
      });
    }

    if (oldMessage) {
      await this.messageRepository.update(
        { _environmentId: command.environmentId, _id: oldMessage._id },
        {
          $set: {
            seen: false,
            createdAt: new Date(),
            ...channelData,
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
