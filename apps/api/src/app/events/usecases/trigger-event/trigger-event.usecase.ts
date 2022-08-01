import { JobEntity, JobRepository, NotificationTemplateEntity, NotificationTemplateRepository } from '@novu/dal';
import { Inject, Injectable } from '@nestjs/common';
import { ChannelTypeEnum, LogCodeEnum, LogStatusEnum } from '@novu/shared';
import * as Sentry from '@sentry/node';
import { TriggerEventCommand } from './trigger-event.command';
import { CreateLog } from '../../../logs/usecases/create-log/create-log.usecase';
import { CreateLogCommand } from '../../../logs/usecases/create-log/create-log.command';
import { AnalyticsService } from '../../../shared/services/analytics/analytics.service';
import { matchMessageWithFilters } from './message-filter.matcher';
import { ANALYTICS_SERVICE } from '../../../shared/shared.module';
import { ApiException } from '../../../shared/exceptions/api.exception';
import { ClientProxy } from '@nestjs/microservices';

@Injectable()
export class TriggerEvent {
  constructor(
    private notificationTemplateRepository: NotificationTemplateRepository,
    private createLogUsecase: CreateLog,
    private jobRepository: JobRepository,
    @Inject(ANALYTICS_SERVICE) private analyticsService: AnalyticsService,
    @Inject('TRIGGER_SERVICE') private client: ClientProxy
  ) {}

  async execute(command: TriggerEventCommand) {
    Sentry.addBreadcrumb({
      message: 'Sending trigger',
      data: {
        triggerIdentifier: command.identifier,
      },
    });

    await this.validateTransactionIdProperty(command);
    await this.validateSubscriberIdProperty(command);

    this.logEventTriggered(command);

    const template = await this.notificationTemplateRepository.findByTriggerIdentifier(
      command.environmentId,
      command.identifier
    );

    if (!template) {
      return this.logTemplateNotFound(command);
    }

    if (!template.active || template.draft) {
      return this.logTemplateNotActive(command, template);
    }

    if (command.payload.$on_boarding_trigger && template.name.toLowerCase().includes('on-boarding')) {
      return 'Your first notification was sent! Check your notification bell in the demo dashboard to Continue.';
    } else {
      this.client.emit('trigger_event', {
        userId: command.userId,
        identifier: command.identifier,
        payload: command.payload,
        to: command.to,
        transactionId: command.transactionId,
        organizationId: command.organizationId,
        environmentId: command.environmentId,
      });
    }

    return {
      acknowledged: true,
      status: 'processed',
      transactionId: command.transactionId,
    };
  }

  private async logTemplateNotActive(command: TriggerEventCommand, template: NotificationTemplateEntity) {
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

  private async logTemplateNotFound(command: TriggerEventCommand) {
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

  private logEventTriggered(command: TriggerEventCommand) {
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
  }

  private async validateSubscriberIdProperty(command: TriggerEventCommand): Promise<boolean> {
    for (const subscriber of command.to) {
      const subscriberIdExists = typeof subscriber === 'string' ? subscriber : subscriber.subscriberId;

      if (!subscriberIdExists) {
        this.logSubscriberIdMissing(command);

        throw new ApiException(
          'subscriberId under property to is not configured, please make sure all the subscriber contains subscriberId property'
        );
      }
    }

    return true;
  }

  private async validateTransactionIdProperty(command: TriggerEventCommand): Promise<boolean> {
    const found = await this.jobRepository.findOne(
      {
        transactionId: command.transactionId,
        _environmentId: command.environmentId,
      },
      '_id'
    );

    if (found) {
      throw new ApiException(
        'transactionId property is not unique, please make sure all triggers have a unique transactionId'
      );
    }

    return true;
  }

  private async logSubscriberIdMissing(command: TriggerEventCommand) {
    await this.createLogUsecase.execute(
      CreateLogCommand.create({
        transactionId: command.transactionId,
        status: LogStatusEnum.ERROR,
        environmentId: command.environmentId,
        organizationId: command.organizationId,
        text: 'SubscriberId missing in to property',
        userId: command.userId,
        code: LogCodeEnum.SUBSCRIBER_ID_MISSING,
        raw: {
          triggerIdentifier: command.identifier,
        },
      })
    );

    return {
      acknowledged: true,
      status: 'subscriber_id_missing',
    };
  }
}
