import { Injectable, Logger } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';

import {
  MessageRepository,
  NotificationStepEntity,
  SubscriberRepository,
  EnvironmentRepository,
  IntegrationEntity,
  MessageEntity,
  LayoutRepository,
} from '@novu/dal';
import {
  ChannelTypeEnum,
  EmailProviderIdEnum,
  ExecutionDetailsSourceEnum,
  ExecutionDetailsStatusEnum,
  IAttachmentOptions,
  IEmailOptions,
  LogCodeEnum,
} from '@novu/shared';
import * as Sentry from '@sentry/node';
import {
  InstrumentUsecase,
  DetailEnum,
  SelectIntegration,
  CompileEmailTemplate,
  CompileEmailTemplateCommand,
  MailFactory,
  GetNovuProviderCredentials,
  SelectVariant,
  ExecutionLogRoute,
  ExecutionLogRouteCommand,
  IChimeraEmailResponse,
} from '@novu/application-generic';
import * as inlineCss from 'inline-css';
import { CreateLog } from '../../../shared/logs';
import { SendMessageCommand } from './send-message.command';
import { SendMessageBase } from './send-message.base';
import { PlatformException } from '../../../shared/utils';

const LOG_CONTEXT = 'SendMessageEmail';

@Injectable()
export class SendMessageEmail extends SendMessageBase {
  channelType = ChannelTypeEnum.EMAIL;

  constructor(
    protected environmentRepository: EnvironmentRepository,
    protected subscriberRepository: SubscriberRepository,
    protected messageRepository: MessageRepository,
    protected layoutRepository: LayoutRepository,
    protected createLogUsecase: CreateLog,
    protected executionLogRoute: ExecutionLogRoute,
    private compileEmailTemplateUsecase: CompileEmailTemplate,
    protected selectIntegration: SelectIntegration,
    protected getNovuProviderCredentials: GetNovuProviderCredentials,
    protected selectVariant: SelectVariant,
    protected moduleRef: ModuleRef
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
    let integration: IntegrationEntity | undefined = undefined;

    const overrideSelectedIntegration = command.overrides?.email?.integrationIdentifier;
    try {
      integration = await this.getIntegration({
        organizationId: command.organizationId,
        environmentId: command.environmentId,
        channelType: ChannelTypeEnum.EMAIL,
        userId: command.userId,
        identifier: overrideSelectedIntegration as string,
        filterData: {
          tenant: command.job.tenant,
        },
      });
    } catch (e) {
      await this.executionLogRoute.execute(
        ExecutionLogRouteCommand.create({
          ...ExecutionLogRouteCommand.getDetailsFromJob(command.job),
          detail: DetailEnum.LIMIT_PASSED_NOVU_INTEGRATION,
          source: ExecutionDetailsSourceEnum.INTERNAL,
          status: ExecutionDetailsStatusEnum.FAILED,
          raw: JSON.stringify({ message: e.message }),
          isTest: false,
          isRetry: false,
        })
      );

      return;
    }

    const step: NotificationStepEntity = command.step;

    if (!step) throw new PlatformException('Email channel step not found');
    if (!step.template) throw new PlatformException('Email channel template not found');

    const { subscriber } = command.compileContext;
    const email = command.payload.email || subscriber.email;

    Sentry.addBreadcrumb({
      message: 'Sending Email',
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
          ...(overrideSelectedIntegration
            ? {
                raw: JSON.stringify({
                  integrationIdentifier: overrideSelectedIntegration,
                }),
              }
            : {}),
        })
      );

      return;
    }

    const [template, overrideLayoutId] = await Promise.all([
      this.processVariants(command),
      this.getOverrideLayoutId(command),
      this.sendSelectedIntegrationExecution(command.job, integration),
    ]);

    if (template) {
      step.template = template;
    }

    const overrides: Record<string, any> = Object.assign(
      {},
      command.overrides.email || {},
      command.overrides[integration?.providerId] || {}
    );

    let html;
    let subject = step?.template?.subject || '';
    let content;
    let senderName;

    const payload = {
      senderName: step.template.senderName,
      subject,
      preheader: step.template.preheader,
      content: step.template.content,
      layoutId: overrideLayoutId ?? step.template._layoutId,
      contentType: step.template.contentType ? step.template.contentType : 'editor',
      payload: this.getCompilePayload(command.compileContext),
    };

    const messagePayload = Object.assign({}, command.payload);
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
      if (!command.chimeraData) {
        ({ html, content, subject, senderName } = await this.compileEmailTemplateUsecase.execute(
          CompileEmailTemplateCommand.create({
            environmentId: command.environmentId,
            organizationId: command.organizationId,
            userId: command.userId,
            ...payload,
          }),
          this.initiateTranslations.bind(this)
        ));

        if (this.storeContent()) {
          await this.messageRepository.update(
            {
              _id: message._id,
              _environmentId: command.environmentId,
            },
            {
              $set: {
                subject,
                content,
              },
            }
          );
        }

        html = await inlineCss(html, {
          // Used for style sheet links that starts with / so should not be needed in our case.
          url: ' ',
        });
      }
    } catch (e) {
      Logger.error({ payload }, 'Compiling the email template or storing it or inlining it has failed', LOG_CONTEXT);
      await this.sendErrorHandlebars(command.job, e.message);

      return;
    }

    await this.executionLogRoute.execute(
      ExecutionLogRouteCommand.create({
        ...ExecutionLogRouteCommand.getDetailsFromJob(command.job),
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

    const chimeraOutputs = command.chimeraData?.outputs;
    const mailData: IEmailOptions = createMailData(
      {
        to: email,
        subject: (chimeraOutputs as IChimeraEmailResponse)?.subject || subject,
        html: (chimeraOutputs as IChimeraEmailResponse)?.body || html,
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

    if (email && integration) {
      await this.sendMessage(integration, mailData, message, command);

      return;
    }
    await this.sendErrors(email, integration, message, command);
  }

  private async getReplyTo(command: SendMessageCommand, messageId: string): Promise<string | null> {
    if (!command.step.replyCallback?.url) {
      await this.executionLogRoute.execute(
        ExecutionLogRouteCommand.create({
          ...ExecutionLogRouteCommand.getDetailsFromJob(command.job),
          messageId: messageId,
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

      await this.executionLogRoute.execute(
        ExecutionLogRouteCommand.create({
          ...ExecutionLogRouteCommand.getDetailsFromJob(command.job),
          messageId: messageId,
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

  private async sendErrors(email, integration, message: MessageEntity, command: SendMessageCommand) {
    const errorMessage = 'Subscriber does not have an';
    const status = 'warning';
    const errorId = 'mail_unexpected_error';

    if (!email) {
      const mailErrorMessage = `${errorMessage} email address`;

      await this.sendErrorStatus(
        message,
        status,
        errorId,
        mailErrorMessage,
        command,
        LogCodeEnum.SUBSCRIBER_MISSING_EMAIL
      );

      await this.executionLogRoute.execute(
        ExecutionLogRouteCommand.create({
          ...ExecutionLogRouteCommand.getDetailsFromJob(command.job),
          messageId: message._id,
          detail: DetailEnum.SUBSCRIBER_NO_CHANNEL_DETAILS,
          source: ExecutionDetailsSourceEnum.INTERNAL,
          status: ExecutionDetailsStatusEnum.FAILED,
          isTest: false,
          isRetry: false,
        })
      );

      return;
    }

    if (!integration) {
      const integrationError = `${errorMessage} active email integration not found`;

      await this.sendErrorStatus(
        message,
        status,
        errorId,
        integrationError,
        command,
        LogCodeEnum.MISSING_EMAIL_INTEGRATION
      );

      await this.executionLogRoute.execute(
        ExecutionLogRouteCommand.create({
          ...ExecutionLogRouteCommand.getDetailsFromJob(command.job),
          messageId: message._id,
          detail: DetailEnum.SUBSCRIBER_NO_ACTIVE_INTEGRATION,
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
    mailData: IEmailOptions,
    message: MessageEntity,
    command: SendMessageCommand
  ) {
    const mailFactory = new MailFactory();
    const mailHandler = mailFactory.getHandler(this.buildFactoryIntegration(integration), mailData.from);

    try {
      const result = await mailHandler.send(mailData);

      Logger.verbose({ command }, 'Email message has been sent', LOG_CONTEXT);

      await this.executionLogRoute.execute(
        ExecutionLogRouteCommand.create({
          ...ExecutionLogRouteCommand.getDetailsFromJob(command.job),
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
        return;
      }

      await this.messageRepository.update(
        { _environmentId: command.environmentId, _id: message._id },
        {
          $set: {
            identifier: result.id,
          },
        }
      );
    } catch (error) {
      await this.sendErrorStatus(
        message,
        'error',
        'mail_unexpected_error',
        error.message || error.name || 'Error while sending email with provider',
        command,
        LogCodeEnum.MAIL_PROVIDER_DELIVERY_ERROR,
        error
      );

      await this.executionLogRoute.execute(
        ExecutionLogRouteCommand.create({
          ...ExecutionLogRouteCommand.getDetailsFromJob(command.job),
          messageId: message._id,
          detail: DetailEnum.PROVIDER_ERROR,
          source: ExecutionDetailsSourceEnum.INTERNAL,
          status: ExecutionDetailsStatusEnum.FAILED,
          isTest: false,
          isRetry: false,
          raw: JSON.stringify(error) === '{}' ? JSON.stringify({ message: error.message }) : JSON.stringify(error),
        })
      );

      return;
    }
  }

  private async getOverrideLayoutId(command: SendMessageCommand) {
    const overrideLayoutIdentifier = command.overrides?.layoutIdentifier;

    if (overrideLayoutIdentifier) {
      const layoutOverride = await this.layoutRepository.findOne(
        {
          _environmentId: command.environmentId,
          identifier: overrideLayoutIdentifier,
        },
        '_id'
      );
      if (!layoutOverride) {
        await this.executionLogRoute.execute(
          ExecutionLogRouteCommand.create({
            ...ExecutionLogRouteCommand.getDetailsFromJob(command.job),
            detail: DetailEnum.LAYOUT_NOT_FOUND,
            source: ExecutionDetailsSourceEnum.INTERNAL,
            status: ExecutionDetailsStatusEnum.FAILED,
            isTest: false,
            isRetry: false,
            raw: JSON.stringify({
              layoutIdentifier: overrideLayoutIdentifier,
            }),
          })
        );
      }

      return layoutOverride?._id;
    }
  }

  public buildFactoryIntegration(integration: IntegrationEntity, senderName?: string) {
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
  };
};

export function getReplyToAddress(transactionId: string, environmentId: string, inboundParseDomain: string) {
  const userNamePrefix = 'parse';
  const userNameDelimiter = '-nv-e=';

  return `${userNamePrefix}+${transactionId}${userNameDelimiter}${environmentId}@${inboundParseDomain}`;
}
