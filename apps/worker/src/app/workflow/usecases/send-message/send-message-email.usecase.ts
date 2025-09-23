import { Injectable, Logger, Optional } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import {
  CompileEmailTemplate,
  CompileEmailTemplateCommand,
  CreateExecutionDetails,
  CreateExecutionDetailsCommand,
  DetailEnum,
  FeatureFlagsService,
  GetLayoutCommand,
  GetLayoutUseCase as GetLayoutUseCaseV1,
  GetNovuProviderCredentials,
  InstrumentUsecase,
  MailFactory,
  messageWebhookMapper,
  SelectIntegration,
  SelectVariant,
  SendWebhookMessage,
} from '@novu/application-generic';
import {
  EnvironmentEntity,
  EnvironmentRepository,
  IntegrationEntity,
  LayoutRepository,
  MessageEntity,
  MessageRepository,
  OrganizationEntity,
  SubscriberRepository,
  UserEntity,
} from '@novu/dal';
import { EmailOutput } from '@novu/framework/internal';
import {
  ChannelTypeEnum,
  DeliveryLifecycleDetail,
  DeliveryLifecycleStatus,
  EmailProviderIdEnum,
  ExecutionDetailsSourceEnum,
  ExecutionDetailsStatusEnum,
  FeatureFlagsKeysEnum,
  IAttachmentOptions,
  IEmailOptions,
  WebhookEventEnum,
  WebhookObjectTypeEnum,
} from '@novu/shared';
import { addBreadcrumb } from '@sentry/node';
import inlineCss from 'inline-css';

import { PlatformException } from '../../../shared/utils';
import { SendMessageBase } from './send-message.base';
import { SendMessageChannelCommand } from './send-message-channel.command';
import { SendMessageResult, SendMessageStatus } from './send-message-type.usecase';

const LOG_CONTEXT = 'SendMessageEmail';

@Injectable()
export class SendMessageEmail extends SendMessageBase {
  channelType = ChannelTypeEnum.EMAIL;

  constructor(
    protected environmentRepository: EnvironmentRepository,
    protected subscriberRepository: SubscriberRepository,
    protected messageRepository: MessageRepository,
    protected layoutRepository: LayoutRepository,
    protected createExecutionDetails: CreateExecutionDetails,
    private compileEmailTemplateUsecase: CompileEmailTemplate,
    protected selectIntegration: SelectIntegration,
    protected getNovuProviderCredentials: GetNovuProviderCredentials,
    protected selectVariant: SelectVariant,
    protected moduleRef: ModuleRef,
    private featureFlagService: FeatureFlagsService,
    private getLayoutUseCaseV1: GetLayoutUseCaseV1,
    private sendWebhookMessage: SendWebhookMessage
  ) {
    super(
      messageRepository,
      createExecutionDetails,
      subscriberRepository,
      selectIntegration,
      getNovuProviderCredentials,
      selectVariant,
      moduleRef
    );
  }

  @InstrumentUsecase()
  public async execute(command: SendMessageChannelCommand): Promise<SendMessageResult> {
    let integration: IntegrationEntity | undefined;
    const { subscriber } = command.compileContext;
    const email: string | undefined = command.overrides?.email?.toRecipient || subscriber?.email;

    const overrideSelectedIntegration = command.overrides?.email?.integrationIdentifier;
    try {
      integration = await this.getIntegration({
        organizationId: command.organizationId,
        environmentId: command.environmentId,
        channelType: ChannelTypeEnum.EMAIL,
        userId: command.userId,
        recipientEmail: email,
        identifier: overrideSelectedIntegration as string,
        filterData: {
          tenant: command.job.tenant,
        },
      });
    } catch (e) {
      let detailEnum = DetailEnum.LIMIT_PASSED_NOVU_INTEGRATION;

      if (e.message.includes('does not match the current logged-in user')) {
        detailEnum = DetailEnum.SUBSCRIBER_NOT_MEMBER_OF_ORGANIZATION;
      }

      await this.createExecutionDetails.execute(
        CreateExecutionDetailsCommand.create({
          ...CreateExecutionDetailsCommand.getDetailsFromJob(command.job),
          detail: detailEnum,
          source: ExecutionDetailsSourceEnum.INTERNAL,
          status: ExecutionDetailsStatusEnum.FAILED,
          raw: JSON.stringify({ message: e.message }),
          isTest: false,
          isRetry: false,
        })
      );

      return {
        status: SendMessageStatus.FAILED,
        errorMessage: DetailEnum.LIMIT_PASSED_NOVU_INTEGRATION,
      };
    }

    const { step } = command;

    if (!step) throw new PlatformException('Email channel step not found');
    if (!step.template) throw new PlatformException('Email channel template not found');

    addBreadcrumb({
      message: 'Sending Email',
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
          ...(overrideSelectedIntegration
            ? {
                raw: JSON.stringify({
                  integrationIdentifier: overrideSelectedIntegration,
                }),
              }
            : {}),
        })
      );

      return {
        status: SendMessageStatus.FAILED,
        errorMessage: DetailEnum.SUBSCRIBER_NO_ACTIVE_INTEGRATION,
      };
    }

    const bridgeOutputs = command.bridgeData?.outputs;
    const [template, overrideLayoutId] = await Promise.all([
      this.processVariants(command),
      this.getOverrideLayoutId(command, !!bridgeOutputs),
      this.sendSelectedIntegrationExecution(command.job, integration),
    ]);

    if (template) {
      step.template = template;
    }

    const overrides: Record<string, any> = {
      ...(command.overrides?.email || {}),
      ...(command.overrides?.[integration?.providerId] || {}),
    };

    let html;
    let subject = (bridgeOutputs as EmailOutput)?.subject || step?.template?.subject || '';
    let content;
    let senderName;

    const payload = {
      senderName: step.template.senderName,
      subject,
      preheader: step.template.preheader,
      content: step.template.content,
      layoutId: overrideLayoutId || (overrideLayoutId === null ? null : step.template._layoutId),
      contentType: step.template.contentType ? step.template.contentType : 'editor',
      payload: this.getCompilePayload(command.compileContext),
    };

    const messagePayload = { ...command.payload };
    delete messagePayload.attachments;

    const message: MessageEntity = await this.messageRepository.create({
      _notificationId: command.notificationId,
      _environmentId: command.environmentId,
      _organizationId: command.organizationId,
      _subscriberId: command._subscriberId,
      _templateId: command._templateId,
      _messageTemplateId: step.template._id,
      subject,
      channel: ChannelTypeEnum.EMAIL,
      transactionId: command.transactionId,
      email,
      providerId: integration?.providerId,
      payload: messagePayload,
      overrides,
      templateIdentifier: command.identifier,
      _jobId: command.jobId,
      tags: command.tags,
      severity: command.severity,
      ...(command.contextKeys && { contextKeys: command.contextKeys }),
    });

    let replyToAddress: string | undefined;
    if (command.step.replyCallback?.active) {
      const replyTo = await this.getReplyTo(command, message._id);

      if (replyTo) {
        replyToAddress = replyTo;

        if (payload.payload.step) {
          payload.payload.step.reply_to_address = replyTo;
        }
      }
    }

    try {
      const i18nInstance = await this.initiateTranslations(
        command.environmentId,
        command.organizationId,
        subscriber?.locale
      );

      if (!command.bridgeData) {
        ({ html, content, subject, senderName } = await this.compileEmailTemplateUsecase.execute(
          CompileEmailTemplateCommand.create({
            environmentId: command.environmentId,
            organizationId: command.organizationId,
            userId: command.userId,
            ...payload,
          }),
          i18nInstance
        ));

        // TODO: remove as part of https://linear.app/novu/issue/NV-4117/email-html-content-issue-in-mobile-devices
        const shouldDisableInlineCss = await this.featureFlagService.getFlag({
          key: FeatureFlagsKeysEnum.IS_EMAIL_INLINE_CSS_DISABLED,
          defaultValue: false,
          environment: { _id: command.environmentId } as EnvironmentEntity,
          organization: { _id: command.organizationId } as OrganizationEntity,
          user: { _id: command.userId } as UserEntity,
        });

        if (!shouldDisableInlineCss) {
          // this is causing rendering issues in Gmail (especially when media queries are used), so we are disabling it
          html = await inlineCss(html, {
            // Used for style sheet links that starts with / so should not be needed in our case.
            url: ' ',
          });
        }
      }
    } catch (error) {
      Logger.error(
        { payload, error },
        'Compiling the email template or storing it or inlining it has failed',
        LOG_CONTEXT
      );
      await this.sendErrorHandlebars(command.job, error.message);

      return {
        status: SendMessageStatus.FAILED,
        errorMessage: DetailEnum.MESSAGE_CONTENT_NOT_GENERATED,
      };
    }

    if (this.storeContent()) {
      await this.messageRepository.update(
        {
          _id: message._id,
          _environmentId: command.environmentId,
        },
        {
          $set: {
            subject,
            content: (bridgeOutputs as EmailOutput)?.body || content,
          },
        }
      );
    }

    await this.createExecutionDetails.execute(
      CreateExecutionDetailsCommand.create({
        ...CreateExecutionDetailsCommand.getDetailsFromJob(command.job),
        detail: DetailEnum.MESSAGE_CREATED,
        source: ExecutionDetailsSourceEnum.INTERNAL,
        status: ExecutionDetailsStatusEnum.PENDING,
        messageId: message._id,
        isTest: false,
        isRetry: false,
        raw: this.storeContent() ? JSON.stringify(payload) : null,
      })
    );

    const attachments = (<IAttachmentOptions[]>command.payload.attachments)?.map(
      (attachment) =>
        <IAttachmentOptions>{
          file: attachment.file,
          mime: attachment.mime,
          name: attachment.name,
          channels: attachment.channels,
        }
    );

    if (!email || !integration) {
      return await this.sendErrors(email, integration, message, command);
    }

    const mailData: IEmailOptions = createMailData(
      {
        // @ts-expect-error
        to: email,
        subject,
        html: (bridgeOutputs as EmailOutput)?.body || html,
        from: integration?.credentials.from || 'no-reply@novu.co',
        attachments,
        senderName,
        id: message._id,
        replyTo: replyToAddress,
        notificationDetails: {
          transactionId: command.transactionId,
          workflowIdentifier: command.identifier,
          subscriberId: subscriber.subscriberId,
        },
      },
      overrides || {}
    );

    if (command.overrides?.email?.replyTo) {
      mailData.replyTo = command.overrides?.email?.replyTo as string;
    }

    if (integration.providerId === EmailProviderIdEnum.EmailWebhook) {
      mailData.payloadDetails = payload;
    }

    return await this.sendMessage(integration, mailData, message, command);
  }

  private async getReplyTo(command: SendMessageChannelCommand, messageId: string): Promise<string | null> {
    if (!command.step.replyCallback?.url) {
      await this.createExecutionDetails.execute(
        CreateExecutionDetailsCommand.create({
          ...CreateExecutionDetailsCommand.getDetailsFromJob(command.job),
          messageId,
          detail: DetailEnum.REPLY_CALLBACK_MISSING_REPLAY_CALLBACK_URL,
          source: ExecutionDetailsSourceEnum.INTERNAL,
          status: ExecutionDetailsStatusEnum.WARNING,
          isTest: false,
          isRetry: false,
        })
      );

      return null;
    }

    const environment = await this.environmentRepository.findOne({ _id: command.environmentId });
    if (!environment) {
      throw new PlatformException(`Environment ${command.environmentId} is not found`);
    }

    if (environment.dns?.mxRecordConfigured && environment.dns?.inboundParseDomain) {
      return getReplyToAddress(command.transactionId, environment._id, environment?.dns?.inboundParseDomain);
    } else {
      const detailEnum =
        !environment.dns?.mxRecordConfigured && !environment.dns?.inboundParseDomain
          ? DetailEnum.REPLY_CALLBACK_NOT_CONFIGURATION
          : !environment.dns?.mxRecordConfigured
            ? DetailEnum.REPLY_CALLBACK_MISSING_MX_RECORD_CONFIGURATION
            : DetailEnum.REPLY_CALLBACK_MISSING_MX_ROUTE_DOMAIN_CONFIGURATION;

      await this.createExecutionDetails.execute(
        CreateExecutionDetailsCommand.create({
          ...CreateExecutionDetailsCommand.getDetailsFromJob(command.job),
          messageId,
          detail: detailEnum,
          source: ExecutionDetailsSourceEnum.INTERNAL,
          status: ExecutionDetailsStatusEnum.WARNING,
          isTest: false,
          isRetry: false,
        })
      );

      return null;
    }
  }

  private async sendErrors(
    email: string | undefined,
    integration: IntegrationEntity | undefined,
    message: MessageEntity,
    command: SendMessageChannelCommand
  ): Promise<SendMessageResult> {
    const errorMessage = 'Subscriber does not have an';
    const status = 'warning';
    const errorId = 'mail_unexpected_error';

    if (!email) {
      const mailErrorMessage = `${errorMessage} email address`;

      await this.sendErrorStatus(message, status, errorId, mailErrorMessage, command);

      await this.createExecutionDetails.execute(
        CreateExecutionDetailsCommand.create({
          ...CreateExecutionDetailsCommand.getDetailsFromJob(command.job),
          messageId: message._id,
          detail: DetailEnum.SUBSCRIBER_MISSING_EMAIL_ADDRESS,
          source: ExecutionDetailsSourceEnum.INTERNAL,
          status: ExecutionDetailsStatusEnum.FAILED,
          isTest: false,
          isRetry: false,
        })
      );

      return {
        status: SendMessageStatus.SKIPPED,
        deliveryLifecycleState: {
          status: DeliveryLifecycleStatus.SKIPPED,
          detail: DeliveryLifecycleDetail.USER_MISSING_EMAIL,
        },
      };
    }

    if (!integration) {
      const integrationError = `${errorMessage} active email integration not found`;

      await this.sendErrorStatus(message, status, errorId, integrationError, command);

      await this.createExecutionDetails.execute(
        CreateExecutionDetailsCommand.create({
          ...CreateExecutionDetailsCommand.getDetailsFromJob(command.job),
          messageId: message._id,
          detail: DetailEnum.SUBSCRIBER_NO_ACTIVE_INTEGRATION,
          source: ExecutionDetailsSourceEnum.INTERNAL,
          status: ExecutionDetailsStatusEnum.FAILED,
          isTest: false,
          isRetry: false,
        })
      );

      return {
        status: SendMessageStatus.FAILED,
        errorMessage: DetailEnum.SUBSCRIBER_NO_ACTIVE_INTEGRATION,
      };
    }

    return {
      status: SendMessageStatus.FAILED,
      errorMessage: DetailEnum.PROVIDER_ERROR,
    };
  }

  private async sendMessage(
    integration: IntegrationEntity,
    mailData: IEmailOptions,
    message: MessageEntity,
    command: SendMessageChannelCommand
  ): Promise<SendMessageResult> {
    const mailFactory = new MailFactory();
    const mailHandler = mailFactory.getHandler(this.buildFactoryIntegration(integration), mailData.from);

    try {
      const result = await mailHandler.send({
        ...mailData,
        bridgeProviderData: this.combineOverrides(
          command.bridgeData,
          command.overrides,
          command.step.stepId,
          integration.providerId
        ),
      });

      await this.sendWebhookMessage.execute({
        eventType: WebhookEventEnum.MESSAGE_SENT,
        objectType: WebhookObjectTypeEnum.MESSAGE,
        payload: {
          object: messageWebhookMapper(message, command.subscriberId, {
            providerResponseId: result.id,
          }),
        },
        organizationId: command.organizationId,
        environmentId: command.environmentId,
      });

      Logger.verbose({ command }, 'Email message has been sent', LOG_CONTEXT);

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

      Logger.verbose({ command }, 'Execution details of sending an email message have been stored', LOG_CONTEXT);

      if (!result?.id) {
        return {
          status: SendMessageStatus.FAILED,
          errorMessage: DetailEnum.PROVIDER_ERROR,
        };
      }

      await this.messageRepository.update(
        { _environmentId: command.environmentId, _id: message._id },
        {
          $set: {
            identifier: result.id,
          },
        }
      );

      return {
        status: SendMessageStatus.SUCCESS,
      };
    } catch (error) {
      await this.sendErrorStatus(
        message,
        'error',
        'mail_unexpected_error',
        error.message || error.name || 'Error while sending email with provider',
        command,
        error
      );

      /*
       * Axios Error, to provide better readability, otherwise stringify ignores response object
       * TODO: Handle this at the handler level globally
       */
      if (error?.isAxiosError && error.response) {
        error = error.response;
      }

      await this.sendWebhookMessage.execute({
        eventType: WebhookEventEnum.MESSAGE_FAILED,
        objectType: WebhookObjectTypeEnum.MESSAGE,
        payload: {
          object: messageWebhookMapper(message, command.subscriberId),
          error: {
            message: error.message || error.name || 'Error while sending email with provider',
          },
        },
        organizationId: command.organizationId,
        environmentId: command.environmentId,
      });

      await this.createExecutionDetails.execute(
        CreateExecutionDetailsCommand.create({
          ...CreateExecutionDetailsCommand.getDetailsFromJob(command.job),
          messageId: message._id,
          detail: DetailEnum.PROVIDER_ERROR,
          source: ExecutionDetailsSourceEnum.INTERNAL,
          status: ExecutionDetailsStatusEnum.FAILED,
          isTest: false,
          isRetry: false,
          raw: JSON.stringify(error) === '{}' ? JSON.stringify({ message: error.message }) : JSON.stringify(error),
        })
      );

      return {
        status: SendMessageStatus.FAILED,
        errorMessage: DetailEnum.PROVIDER_ERROR,
      };
    }
  }

  private async getOverrideLayoutId(command: SendMessageChannelCommand, isBridge: boolean) {
    const { overrides, step } = command;
    let layoutId: string | null | undefined;
    let overrideSource: string | undefined;

    // Step 1: Check step-level override (highest priority)
    const stepId = overrides?.steps?.[step._id ?? ''] ? step._id : step.stepId;
    const stepOverrides = overrides?.steps?.[stepId ?? ''];
    if (stepOverrides?.layoutId !== undefined) {
      layoutId = stepOverrides.layoutId;
      overrideSource = 'step';
    }
    // Step 2: Check channel-level override for email
    else if (overrides?.channels?.email?.layoutId !== undefined) {
      layoutId = overrides.channels.email.layoutId;
      overrideSource = 'channel';
    }
    // Step 3: Check deprecated layoutIdentifier (backward compatibility)
    else if (overrides?.layoutIdentifier) {
      layoutId = overrides.layoutIdentifier;
      overrideSource = 'layoutIdentifier';
    }

    // If no override is specified, return undefined (use step configuration)
    if (layoutId === undefined) {
      return undefined;
    }

    // If explicitly set to null, return null (no layout)
    if (layoutId === null) {
      return null;
    }

    if (isBridge) {
      return layoutId;
    }

    // Look up layout by identifier or MongoDB ObjectId
    try {
      const layout = await this.getLayoutUseCaseV1.execute(
        GetLayoutCommand.create({
          layoutIdOrInternalId: layoutId,
          environmentId: command.environmentId,
          organizationId: command.organizationId,
        })
      );

      return layout._id;
    } catch (error) {
      await this.createExecutionDetails.execute(
        CreateExecutionDetailsCommand.create({
          ...CreateExecutionDetailsCommand.getDetailsFromJob(command.job),
          detail: DetailEnum.LAYOUT_NOT_FOUND,
          source: ExecutionDetailsSourceEnum.INTERNAL,
          status: ExecutionDetailsStatusEnum.FAILED,
          isTest: false,
          isRetry: false,
          raw: JSON.stringify({
            layoutId,
            overrideSource,
            error: error.message,
          }),
        })
      );
    }
  }

  public buildFactoryIntegration(integration: IntegrationEntity) {
    return {
      ...integration,
      credentials: {
        ...integration.credentials,
      },
      providerId: integration.providerId,
    };
  }
}

export const createMailData = (options: IEmailOptions, overrides: Record<string, any>): IEmailOptions => {
  const filterDuplicate = (prev: string[], current: string) => (prev.includes(current) ? prev : [...prev, current]);

  let to = Array.isArray(options.to) ? options.to : [options.to];
  to = [...to, ...(overrides?.to || [])];
  to = to.reduce(filterDuplicate, []);
  const ipPoolName = overrides?.ipPoolName ? { ipPoolName: overrides?.ipPoolName } : {};

  return {
    ...options,
    to,
    from: overrides?.from || options.from,
    text: overrides?.text,
    html: overrides?.html || overrides?.text || options.html,
    cc: overrides?.cc || [],
    bcc: overrides?.bcc || [],
    ...ipPoolName,
    senderName: overrides?.senderName || options.senderName,
    subject: overrides?.subject || options.subject,
    customData: overrides?.customData || {},
    headers: overrides?.headers || {},
  };
};

export function getReplyToAddress(transactionId: string, environmentId: string, inboundParseDomain: string) {
  const userNamePrefix = 'parse';
  const userNameDelimiter = '-nv-e=';

  return `${userNamePrefix}+${transactionId}${userNameDelimiter}${environmentId}@${inboundParseDomain}`;
}
