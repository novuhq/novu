import { Injectable } from '@nestjs/common';
import {
  IEmailBlock,
  IntegrationRepository,
  MessageRepository,
  NotificationEntity,
  NotificationStepEntity,
  NotificationRepository,
  NotificationTemplateEntity,
  NotificationTemplateRepository,
  SubscriberEntity,
  SubscriberRepository,
  OrganizationRepository,
  OrganizationEntity,
} from '@novu/dal';
import { ChannelTypeEnum, LogCodeEnum, LogStatusEnum } from '@novu/shared';
import * as Sentry from '@sentry/node';
import { IEmailOptions } from '@novu/stateless';
import { TriggerEventCommand } from './trigger-event.command';
import { ContentService } from '../../../shared/helpers/content.service';
import { CreateSubscriber, CreateSubscriberCommand } from '../../../subscribers/usecases/create-subscriber';
import { matchMessageWithFilters } from './message-filter.matcher';
import { CreateLog } from '../../../logs/usecases/create-log/create-log.usecase';
import { CreateLogCommand } from '../../../logs/usecases/create-log/create-log.command';
import { CompileTemplate } from '../../../content-templates/usecases/compile-template/compile-template.usecase';
import { CompileTemplateCommand } from '../../../content-templates/usecases/compile-template/compile-template.command';
import { MailService } from '../../../shared/services/mail/mail.service';
import { QueueService } from '../../../shared/services/queue';
import { AnalyticsService } from '../../../shared/services/analytics/analytics.service';
import { SmsFactory } from '../../services/sms-service/sms.factory';
import { MailFactory } from '../../services/mail-service/mail.factory';
import { ISubscribersDefine } from '@novu/node';

@Injectable()
export class TriggerEvent {
  private mailFactory = new MailFactory();
  private smsFactory = new SmsFactory();
  constructor(
    private notificationTemplateRepository: NotificationTemplateRepository,
    private subscriberRepository: SubscriberRepository,
    private notificationRepository: NotificationRepository,
    private messageRepository: MessageRepository,
    private mailService: MailService,
    private queueService: QueueService,
    private organizationRepository: OrganizationRepository,
    private createSubscriberUsecase: CreateSubscriber,
    private createLogUsecase: CreateLog,
    private analyticsService: AnalyticsService,
    private compileTemplate: CompileTemplate,
    private integrationRepository: IntegrationRepository
  ) {}

  async execute(command: TriggerEventCommand) {
    Sentry.addBreadcrumb({
      message: 'Sending trigger',
      data: {
        triggerIdentifier: command.identifier,
      },
    });

    this.createLogUsecase
      .execute(
        CreateLogCommand.create({
          transactionId: command.transactionId,
          status: LogStatusEnum.INFO,
          environmentId: command.environmentId,
          organizationId: command.organizationId,
          text: 'Trigger request received',
          userId: command.userId,
          code: LogCodeEnum.TRIGGER_RECEIVED,
          raw: {
            subscribers: command.to,
            payload: command.payload,
          },
        })
      )
      // eslint-disable-next-line no-console
      .catch((e) => console.error(e));

    const template = await this.notificationTemplateRepository.findByTriggerIdentifier(
      command.environmentId,
      command.identifier
    );

    if (!template) {
      await this.createLogUsecase.execute(
        CreateLogCommand.create({
          transactionId: command.transactionId,
          status: LogStatusEnum.ERROR,
          environmentId: command.environmentId,
          organizationId: command.organizationId,
          text: 'Template not found',
          userId: command.userId,
          code: LogCodeEnum.TEMPLATE_NOT_FOUND,
          raw: {
            triggerIdentifier: command.identifier,
          },
        })
      );

      return {
        acknowledged: true,
        status: 'template_not_found',
      };
    }

    if (!template.active || template.draft) {
      await this.createLogUsecase.execute(
        CreateLogCommand.create({
          transactionId: command.transactionId,
          status: LogStatusEnum.ERROR,
          environmentId: command.environmentId,
          organizationId: command.organizationId,
          text: 'Template not active',
          userId: command.userId,
          code: LogCodeEnum.TEMPLATE_NOT_ACTIVE,
          templateId: template._id,
          raw: {
            payload: command.payload,
            triggerIdentifier: command.identifier,
          },
        })
      );

      return {
        acknowledged: true,
        status: 'trigger_not_active',
      };
    }

    const organization = await this.organizationRepository.findById(command.organizationId);
    const { smsMessages, inAppChannelMessages, emailChannelMessages } = this.extractMatchingMessages(
      template,
      command.payload
    );

    const channelsToSend: ChannelTypeEnum[] = [];
    if (smsMessages?.length) {
      channelsToSend.push(ChannelTypeEnum.SMS);
    }

    if (inAppChannelMessages?.length) {
      channelsToSend.push(ChannelTypeEnum.IN_APP);
    }

    if (emailChannelMessages?.length) {
      channelsToSend.push(ChannelTypeEnum.EMAIL);
    }

    const errors = [];

    for (const subscriberToTrigger of command.to) {
      await this.processSubscriber(
        subscriberToTrigger,
        command,
        template,
        smsMessages,
        channelsToSend,
        inAppChannelMessages,
        emailChannelMessages,
        organization
      );
    }

    this.analyticsService.track('Notification event trigger - [Triggers]', command.userId, {
      smsChannel: !!smsMessages?.length,
      emailChannel: !!emailChannelMessages?.length,
      inAppChannel: !!inAppChannelMessages?.length,
    });

    if (command.payload.$on_boarding_trigger && template.name.toLowerCase().includes('on-boarding')) {
      return 'Your first notification was sent! Check your notification bell in the demo dashboard to Continue.';
    }

    return {
      acknowledged: true,
      status: 'processed',
    };
  }

  private async processSubscriber(
    subscriberPayload: ISubscribersDefine,
    command: TriggerEventCommand,
    template: NotificationTemplateEntity,
    smsMessages: NotificationStepEntity[],
    channelsToSend: ChannelTypeEnum[],
    inAppChannelMessages: NotificationStepEntity[],
    emailChannelMessages: NotificationStepEntity[],
    organization: OrganizationEntity
  ) {
    let subscriber = await this.subscriberRepository.findBySubscriberId(
      command.environmentId,
      subscriberPayload.subscriberId
    );

    if (!subscriber) {
      subscriber = await this.createSubscriberUsecase.execute(
        CreateSubscriberCommand.create({
          environmentId: command.environmentId,
          organizationId: command.organizationId,
          subscriberId: subscriberPayload.subscriberId,
          email: subscriberPayload.email,
          firstName: subscriberPayload.firstName,
          lastName: subscriberPayload.lastName,
          phone: subscriberPayload.phone,
        })
      );
    }

    const notification = await this.notificationRepository.create({
      _environmentId: command.environmentId,
      _organizationId: command.organizationId,
      _subscriberId: subscriber._id,
      _templateId: template._id,
      transactionId: command.transactionId,
    });

    const contentService = new ContentService();
    const messageVariables = contentService.buildMessageVariables(command, subscriber);

    if (smsMessages?.length && this.shouldSendChannel(channelsToSend, ChannelTypeEnum.SMS)) {
      await this.sendSmsMessage(smsMessages, command, notification, subscriber, template, messageVariables);
    }

    if (inAppChannelMessages?.length && this.shouldSendChannel(channelsToSend, ChannelTypeEnum.IN_APP)) {
      await this.sendInAppMessage(inAppChannelMessages, command, notification, subscriber, template, messageVariables);
    }

    if (emailChannelMessages.length && this.shouldSendChannel(channelsToSend, ChannelTypeEnum.EMAIL)) {
      await this.sendEmailMessage(
        emailChannelMessages,
        command,
        notification,
        subscriber,
        template,
        organization,
        messageVariables
      );
    }

    await this.createLogUsecase.execute(
      CreateLogCommand.create({
        transactionId: command.transactionId,
        status: LogStatusEnum.INFO,
        environmentId: command.environmentId,
        organizationId: command.organizationId,
        notificationId: notification._id,
        text: 'Request processed',
        userId: command.userId,
        subscriberId: subscriber._id,
        code: LogCodeEnum.TRIGGER_PROCESSED,
        templateId: template._id,
      })
    );

    return {
      status: 'success',
    };
  }

  private shouldSendChannel(channels: ChannelTypeEnum[], channel: ChannelTypeEnum) {
    return channels.includes(channel);
  }

  private extractMatchingMessages(template: NotificationTemplateEntity, payload) {
    const smsMessages = matchMessageWithFilters(ChannelTypeEnum.SMS, template.steps, payload);
    const inAppChannelMessages = matchMessageWithFilters(ChannelTypeEnum.IN_APP, template.steps, payload);
    const emailChannelMessages = matchMessageWithFilters(ChannelTypeEnum.EMAIL, template.steps, payload);

    return { smsMessages, inAppChannelMessages, emailChannelMessages };
  }

  private async sendSmsMessage(
    smsMessages: NotificationStepEntity[],
    command: TriggerEventCommand,
    notification: NotificationEntity,
    subscriber: SubscriberEntity,
    template: NotificationTemplateEntity,
    messageVariables: { [key: string]: string }
  ) {
    Sentry.addBreadcrumb({
      message: 'Sending SMS',
    });
    const smsChannel = smsMessages[0];
    const contentService = new ContentService();
    const content = contentService.replaceVariables(smsChannel.template.content as string, messageVariables);
    const phone = command.payload.phone || subscriber.phone;

    const message = await this.messageRepository.create({
      _notificationId: notification._id,
      _environmentId: command.environmentId,
      _organizationId: command.organizationId,
      _subscriberId: subscriber._id,
      _templateId: template._id,
      _messageTemplateId: smsChannel.template._id,
      channel: ChannelTypeEnum.SMS,
      transactionId: command.transactionId,
      phone,
      content,
    });

    const integration = await this.integrationRepository.findOne({
      _environmentId: command.environmentId,
      channel: ChannelTypeEnum.SMS,
      active: true,
    });

    if (phone && integration) {
      try {
        const smsHandler = this.smsFactory.getHandler(integration);

        await smsHandler.send({
          to: phone,
          from: integration.credentials.from,
          content,
          attachments: null,
        });
      } catch (e) {
        await this.createLogUsecase.execute(
          CreateLogCommand.create({
            transactionId: command.transactionId,
            status: LogStatusEnum.ERROR,
            environmentId: command.environmentId,
            organizationId: command.organizationId,
            text: e.message || e.name || 'Un-expect SMS provider error',
            userId: command.userId,
            code: LogCodeEnum.SMS_ERROR,
            templateId: template._id,
            raw: {
              payload: command.payload,
              triggerIdentifier: command.identifier,
            },
          })
        );

        await this.messageRepository.updateMessageStatus(
          message._id,
          'error',
          e,
          'unexpected_sms_error',
          e.message || e.name || 'Un-expect SMS provider error'
        );
      }
    } else if (!phone) {
      await this.createLogUsecase.execute(
        CreateLogCommand.create({
          transactionId: command.transactionId,
          status: LogStatusEnum.ERROR,
          environmentId: command.environmentId,
          organizationId: command.organizationId,
          text: 'Subscriber does not have active phone',
          userId: command.userId,
          subscriberId: subscriber._id,
          code: LogCodeEnum.SUBSCRIBER_MISSING_PHONE,
          templateId: template._id,
          raw: {
            payload: command.payload,
            triggerIdentifier: command.identifier,
          },
        })
      );
      await this.messageRepository.updateMessageStatus(
        message._id,
        'warning',
        null,
        'no_subscriber_phone',
        'Subscriber does not have active phone'
      );
    } else if (!integration) {
      await this.sendErrorStatus(
        message,
        'warning',
        'sms_missing_integration_error',
        'Subscriber does not have an active sms integration',
        command,
        notification,
        subscriber,
        template,
        LogCodeEnum.MISSING_SMS_INTEGRATION
      );
    } else if (!integration?.credentials?.from) {
      await this.sendErrorStatus(
        message,
        'warning',
        'no_integration_from_phone',
        'Integration does not have from phone configured',
        command,
        notification,
        subscriber,
        template,
        LogCodeEnum.MISSING_SMS_PROVIDER
      );
    }
  }

  private async sendInAppMessage(
    inAppChannelMessages: NotificationStepEntity[],
    command: TriggerEventCommand,
    notification: NotificationEntity,
    subscriber: SubscriberEntity,
    template: NotificationTemplateEntity,
    messageVariables: { [key: string]: string }
  ) {
    Sentry.addBreadcrumb({
      message: 'Sending In App',
    });
    const inAppChannel = inAppChannelMessages[0];

    const contentService = new ContentService();

    const content = contentService.replaceVariables(inAppChannel.template.content as string, messageVariables);
    if (inAppChannel.template.cta?.data?.url) {
      inAppChannel.template.cta.data.url = contentService.replaceVariables(
        inAppChannel.template.cta?.data?.url,
        messageVariables
      );
    }

    const message = await this.messageRepository.create({
      _notificationId: notification._id,
      _environmentId: command.environmentId,
      _organizationId: command.organizationId,
      _subscriberId: subscriber._id,
      _templateId: template._id,
      _messageTemplateId: inAppChannel.template._id,
      channel: ChannelTypeEnum.IN_APP,
      cta: inAppChannel.template.cta,
      transactionId: command.transactionId,
      content,
    });

    const count = await this.messageRepository.getUnseenCount(
      command.environmentId,
      subscriber._id,
      ChannelTypeEnum.IN_APP
    );

    await this.createLogUsecase.execute(
      CreateLogCommand.create({
        transactionId: command.transactionId,
        status: LogStatusEnum.SUCCESS,
        environmentId: command.environmentId,
        organizationId: command.organizationId,
        notificationId: notification._id,
        messageId: message._id,
        text: 'In App message created',
        userId: command.userId,
        subscriberId: subscriber._id,
        code: LogCodeEnum.IN_APP_MESSAGE_CREATED,
        templateId: template._id,
        raw: {
          payload: command.payload,
          triggerIdentifier: command.identifier,
        },
      })
    );

    await this.queueService.wsSocketQueue.add({
      event: 'unseen_count_changed',
      userId: subscriber._id,
      payload: {
        unseenCount: count,
      },
    });
  }

  private async sendEmailMessage(
    emailChannelMessages: NotificationStepEntity[],
    command: TriggerEventCommand,
    notification: NotificationEntity,
    subscriber: SubscriberEntity,
    template: NotificationTemplateEntity,
    organization: OrganizationEntity,
    messageVariables: { [key: string]: string }
  ) {
    const email = command.payload.email || subscriber.email;

    Sentry.addBreadcrumb({
      message: 'Sending Email',
    });
    const emailChannel = emailChannelMessages[0];
    const isEditorMode = !emailChannel.template.contentType || emailChannel.template.contentType === 'editor';

    let content: string | IEmailBlock[] = '';

    if (isEditorMode) {
      content = [...emailChannel.template.content] as IEmailBlock[];
      for (const block of content) {
        const contentService = new ContentService();

        block.content = contentService.replaceVariables(block.content, messageVariables);
        block.url = contentService.replaceVariables(block.url, messageVariables);
      }
    } else {
      content = emailChannel.template.content;
    }

    const message = await this.messageRepository.create({
      _notificationId: notification._id,
      _environmentId: command.environmentId,
      _organizationId: command.organizationId,
      _subscriberId: subscriber._id,
      _templateId: template._id,
      _messageTemplateId: emailChannel.template._id,
      content,
      channel: ChannelTypeEnum.EMAIL,
      transactionId: command.transactionId,
      email,
    });

    const contentService = new ContentService();
    const subject = contentService.replaceVariables(emailChannel.template.subject, messageVariables);

    const html = await this.compileTemplate.execute(
      CompileTemplateCommand.create({
        templateId: isEditorMode ? 'basic' : 'custom',
        customTemplate: emailChannel.template.contentType === 'customHtml' ? (content as string) : undefined,
        data: {
          subject,
          branding: {
            logo: organization.branding?.logo,
            color: organization.branding?.color || '#f47373',
          },
          blocks: isEditorMode ? content : [],
          ...messageVariables,
        },
      })
    );

    const integration = await this.integrationRepository.findOne({
      _environmentId: command.environmentId,
      channel: ChannelTypeEnum.EMAIL,
      active: true,
    });

    const mailData: IEmailOptions = {
      to: email,
      subject,
      html,
      from: command.payload.$sender_email || integration?.credentials.from || 'no-reply@novu.co',
    };

    if (email && integration) {
      const mailHandler = this.mailFactory.getHandler(integration, mailData.from);

      try {
        await mailHandler.send(mailData);
      } catch (error) {
        Sentry.captureException(error?.response?.body || error?.response || error);
        this.messageRepository.updateMessageStatus(
          message._id,
          'error',
          error?.response?.body || error?.response || error,
          'mail_unexpected_error',
          'Error while sending email with provider'
        );
        await this.createLogUsecase.execute(
          CreateLogCommand.create({
            transactionId: command.transactionId,
            status: LogStatusEnum.ERROR,
            environmentId: command.environmentId,
            organizationId: command.organizationId,
            notificationId: notification._id,
            messageId: message._id,
            text: 'Error while sending email with provider',
            userId: command.userId,
            subscriberId: subscriber._id,
            code: LogCodeEnum.MAIL_PROVIDER_DELIVERY_ERROR,
            templateId: template._id,
            raw: {
              error: error?.response?.body || error?.response || error,
              payload: command.payload,
              triggerIdentifier: command.identifier,
            },
          })
        );
      }
    } else {
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
          subscriber,
          template,
          LogCodeEnum.SUBSCRIBER_MISSING_EMAIL
        );
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
          subscriber,
          template,
          LogCodeEnum.MISSING_EMAIL_INTEGRATION
        );
      }
    }
  }

  private async sendErrorStatus(
    message,
    status: 'error' | 'sent' | 'warning',
    errorId: string,
    errorMessage: string,
    command: TriggerEventCommand,
    notification,
    subscriber,
    template,
    logCodeEnum: LogCodeEnum
  ) {
    await this.messageRepository.updateMessageStatus(message._id, status, null, errorId, errorMessage);

    await this.createLogUsecase.execute(
      CreateLogCommand.create({
        transactionId: command.transactionId,
        status: LogStatusEnum.ERROR,
        environmentId: command.environmentId,
        organizationId: command.organizationId,
        notificationId: notification._id,
        text: errorMessage,
        userId: command.userId,
        subscriberId: subscriber._id,
        code: logCodeEnum,
        templateId: template._id,
      })
    );
  }
}
