import { Injectable } from '@nestjs/common';
import {
  IEmailBlock,
  MessageRepository,
  NotificationStepEntity,
  NotificationRepository,
  SubscriberEntity,
  SubscriberRepository,
  OrganizationRepository,
  MessageEntity,
  NotificationEntity,
  OrganizationEntity,
  IntegrationEntity,
} from '@novu/dal';
import { ChannelTypeEnum, ExecutionDetailsSourceEnum, ExecutionDetailsStatusEnum, LogCodeEnum } from '@novu/shared';
import * as Sentry from '@sentry/node';
import { IAttachmentOptions, IEmailOptions } from '@novu/stateless';
import { CreateLog } from '../../../logs/usecases/create-log/create-log.usecase';
import { CompileTemplate } from '../../../content-templates/usecases/compile-template/compile-template.usecase';
import { CompileTemplateCommand } from '../../../content-templates/usecases/compile-template/compile-template.command';
import { MailFactory } from '../../services/mail-service/mail.factory';
import { SendMessageCommand } from './send-message.command';
import {
  GetDecryptedIntegrations,
  GetDecryptedIntegrationsCommand,
} from '../../../integrations/usecases/get-decrypted-integrations';
import { CreateExecutionDetails } from '../../../execution-details/usecases/create-execution-details/create-execution-details.usecase';
import {
  CreateExecutionDetailsCommand,
  DetailEnum,
} from '../../../execution-details/usecases/create-execution-details/create-execution-details.command';
import { SendMessageBase } from './send-message.base';
import { ApiException } from '../../../shared/exceptions/api.exception';
import { GetNovuIntegration } from '../../../integrations/usecases/get-novu-integration/get-novu-integration.usecase';

@Injectable()
export class SendMessageEmail extends SendMessageBase {
  channelType = ChannelTypeEnum.EMAIL;

  constructor(
    protected subscriberRepository: SubscriberRepository,
    private notificationRepository: NotificationRepository,
    protected messageRepository: MessageRepository,
    protected createLogUsecase: CreateLog,
    protected createExecutionDetails: CreateExecutionDetails,
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

    let integration: IntegrationEntity | undefined = undefined;

    try {
      integration = await this.getIntegration(
        GetDecryptedIntegrationsCommand.create({
          organizationId: command.organizationId,
          environmentId: command.environmentId,
          channelType: ChannelTypeEnum.EMAIL,
          findOne: true,
          active: true,
        })
      );
    } catch (e) {
      await this.createExecutionDetails.execute(
        CreateExecutionDetailsCommand.create({
          ...CreateExecutionDetailsCommand.getDetailsFromJob(command.job),
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
    const emailChannel: NotificationStepEntity = command.step;
    if (!emailChannel) throw new ApiException('Email channel step not found');
    if (!emailChannel.template) throw new ApiException('Email channel template not found');

    const notification = await this.notificationRepository.findById(command.notificationId);
    if (!notification) throw new ApiException('Notification not found');

    const organization: OrganizationEntity | null = await this.organizationRepository.findById(command.organizationId);
    if (!organization) throw new ApiException('Organization not found');

    const email = command.payload.email || subscriber.email;

    Sentry.addBreadcrumb({
      message: 'Sending Email',
    });
    const isEditorMode = !emailChannel.template.contentType || emailChannel.template.contentType === 'editor';

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
    const overrides = command.overrides[integration?.providerId] || {};
    let subject = '';
    let preheader = emailChannel.template.preheader;
    let content: string | IEmailBlock[] = '';

    const payload = {
      subject: emailChannel.template.subject,
      preheader,
      branding: {
        logo: organization.branding?.logo,
        color: organization.branding?.color || '#f47373',
      },
      blocks: [],
      step: {
        digest: !!command.events?.length,
        events: command.events,
        total_count: command.events?.length,
      },
      subscriber: subscriber,
      ...command.payload,
    };

    try {
      subject = await this.renderContent(
        emailChannel.template.subject || '',
        emailChannel.template.subject,
        organization,
        subscriber,
        command,
        preheader
      );

      content = await this.getContent(
        isEditorMode,
        emailChannel,
        command,
        subscriber,
        subject,
        organization,
        preheader
      );

      if (preheader) {
        preheader = await this.renderContent(preheader, subject, organization, subscriber, command, preheader);
      }
    } catch (e) {
      await this.sendErrorHandlebars(command.job, e.message);

      return;
    }

    const messagePayload = Object.assign({}, command.payload);
    delete messagePayload.attachments;

    const message: MessageEntity = await this.messageRepository.create({
      _notificationId: command.notificationId,
      _environmentId: command.environmentId,
      _organizationId: command.organizationId,
      _subscriberId: command.subscriberId,
      _templateId: notification._templateId,
      _messageTemplateId: emailChannel.template._id,
      content: this.storeContent() ? content : null,
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

    const customTemplate = SendMessageEmail.addPreheader(content as string, emailChannel.template.contentType);
    let html;
    try {
      html = await this.compileTemplate.execute(
        CompileTemplateCommand.create({
          templateId: isEditorMode ? 'basic' : 'custom',
          customTemplate: customTemplate,
          data: {
            subject,
            preheader,
            branding: {
              logo: organization.branding?.logo,
              color: organization.branding?.color || '#f47373',
            },
            blocks: isEditorMode ? content : [],
            step: {
              digest: !!command.events?.length,
              events: command.events,
              total_count: command.events?.length,
            },
            ...command.payload,
          },
        })
      );
    } catch (error) {
      await this.sendErrorStatus(
        message,
        'error',
        'mail_unexpected_error',
        'syntax error in email editor',
        command,
        notification,
        LogCodeEnum.SYNTAX_ERROR_IN_EMAIL_EDITOR
      );

      await this.createExecutionDetails.execute(
        CreateExecutionDetailsCommand.create({
          ...CreateExecutionDetailsCommand.getDetailsFromJob(command.job),
          detail: DetailEnum.MESSAGE_CONTENT_SYNTAX_ERROR,
          source: ExecutionDetailsSourceEnum.INTERNAL,
          status: ExecutionDetailsStatusEnum.FAILED,
          messageId: message._id,
          isTest: false,
          isRetry: false,
          raw: JSON.stringify(error.message),
        })
      );

      return;
    }

    const attachments = (<IAttachmentOptions[]>command.payload.attachments)?.map(
      (attachment) =>
        <IAttachmentOptions>{
          file: attachment.file,
          mime: attachment.mime,
          name: attachment.name,
          channels: attachment.channels,
        }
    );

    const mailData: IEmailOptions = {
      to: email,
      subject,
      html,
      from: command.payload.$sender_email || integration?.credentials.from || 'no-reply@novu.co',
      attachments,
      id: message._id,
    };

    if (email && integration) {
      await this.sendMessage(integration, mailData, message, command, notification);

      return;
    }
    await this.sendErrors(email, integration, message, command, notification);
  }

  private async sendErrors(
    email,
    integration,
    message: MessageEntity,
    command: SendMessageCommand,
    notification: NotificationEntity
  ) {
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
        notification,
        LogCodeEnum.SUBSCRIBER_MISSING_EMAIL
      );

      await this.createExecutionDetails.execute(
        CreateExecutionDetailsCommand.create({
          ...CreateExecutionDetailsCommand.getDetailsFromJob(command.job),
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
        notification,
        LogCodeEnum.MISSING_EMAIL_INTEGRATION
      );

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

      return;
    }
  }

  private async sendMessage(
    integration: IntegrationEntity,
    mailData: IEmailOptions,
    message: MessageEntity,
    command: SendMessageCommand,
    notification: NotificationEntity
  ) {
    const mailFactory = new MailFactory();
    const mailHandler = mailFactory.getHandler(
      {
        ...integration,
        providerId: GetNovuIntegration.mapProviders(ChannelTypeEnum.EMAIL, integration.providerId),
      },
      mailData.from
    );

    try {
      const result = await mailHandler.send(mailData);

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
        'Error while sending email with provider',
        command,
        notification,
        LogCodeEnum.MAIL_PROVIDER_DELIVERY_ERROR,
        error
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
          raw: JSON.stringify(error),
        })
      );

      return;
    }
  }

  private async getContent(
    isEditorMode,
    emailChannel: NotificationStepEntity,
    command: SendMessageCommand,
    subscriber: SubscriberEntity,
    subject,
    organization: OrganizationEntity,
    preheader
  ): Promise<string | IEmailBlock[]> {
    if (isEditorMode) {
      const content: IEmailBlock[] = [...(emailChannel.template?.content as IEmailBlock[])] as IEmailBlock[];
      for (const block of content) {
        /*
         * We need to trim the content in order to avoid mail provider like GMail
         * to display the mail with `[Message clipped]` footer.
         */
        block.content = await this.renderContent(block.content, subject, organization, subscriber, command, preheader);
        block.url = await this.renderContent(block.url || '', subject, organization, subscriber, command, preheader);
      }

      return content;
    }

    return emailChannel.template?.content || '';
  }

  private async renderContent(
    content: string,
    subject,
    organization: OrganizationEntity,
    subscriber,
    command: SendMessageCommand,
    preheader?: string
  ) {
    const renderedContent = await this.compileTemplate.execute(
      CompileTemplateCommand.create({
        templateId: 'custom',
        customTemplate: content as string,
        data: {
          subject,
          preheader,
          branding: {
            logo: organization.branding?.logo,
            color: organization.branding?.color || '#f47373',
          },
          blocks: [],
          step: {
            digest: !!command.events?.length,
            events: command.events,
            total_count: command.events?.length,
          },
          subscriber,
          ...command.payload,
        },
      })
    );

    return renderedContent.trim();
  }

  public static addPreheader(content: string, contentType: 'editor' | 'customHtml' | undefined): string | undefined {
    if (contentType === 'customHtml') {
      // "&nbsp;&zwnj;&nbsp;&zwnj;" is needed to spacing away the rest of the email from the preheader area in email clients
      return content.replace(
        /<body[^>]*>/g,
        `$&{{#if preheader}}
          <div style="display: none; max-height: 0px; overflow: hidden;">
            {{preheader}}
            &nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;
          </div>
        {{/if}}`
      );
    }

    return undefined;
  }
}
