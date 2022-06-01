import { Injectable } from '@nestjs/common';
import { JobEntity, JobRepository, NotificationTemplateEntity, NotificationTemplateRepository } from '@novu/dal';
import { ChannelTypeEnum, LogCodeEnum, LogStatusEnum } from '@novu/shared';
import * as Sentry from '@sentry/node';
import { TriggerEventCommand } from './trigger-event.command';
import { CreateLog } from '../../../logs/usecases/create-log/create-log.usecase';
import { CreateLogCommand } from '../../../logs/usecases/create-log/create-log.command';
import { AnalyticsService } from '../../../shared/services/analytics/analytics.service';
import { ProcessSubscriber } from '../process-subscriber/process-subscriber.usecase';
import { ProcessSubscriberCommand } from '../process-subscriber/process-subscriber.command';
import { matchMessageWithFilters } from './message-filter.matcher';
import { WorkflowQueueService } from '../../services/workflow.queue.service';

@Injectable()
export class TriggerEvent {
  constructor(
    private notificationTemplateRepository: NotificationTemplateRepository,
    private createLogUsecase: CreateLog,
    private analyticsService: AnalyticsService,
    private processSubscriber: ProcessSubscriber,
    private jobRepository: JobRepository,
    private workflowQueueService: WorkflowQueueService
  ) {}

  async execute(command: TriggerEventCommand) {
    Sentry.addBreadcrumb({
      message: 'Sending trigger',
      data: {
        triggerIdentifier: command.identifier,
      },
    });

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

    const jobs: JobEntity[][] = [];

    for (const subscriberToTrigger of command.to) {
      jobs.push(
        await this.processSubscriber.execute(
          ProcessSubscriberCommand.create({
            identifier: command.identifier,
            payload: command.payload,
            to: subscriberToTrigger,
            transactionId: command.transactionId,
            environmentId: command.environmentId,
            organizationId: command.organizationId,
            userId: command.organizationId,
            templateId: template._id,
          })
        )
      );
    }

    const steps = matchMessageWithFilters(template.steps, command.payload);
    this.analyticsService.track('Notification event trigger - [Triggers]', command.userId, {
      smsChannel: !!steps.filter((step) => step.template.type === ChannelTypeEnum.SMS)?.length,
      emailChannel: !!steps.filter((step) => step.template.type === ChannelTypeEnum.EMAIL)?.length,
      inAppChannel: !!steps.filter((step) => step.template.type === ChannelTypeEnum.IN_APP)?.length,
      directChannel: !!steps.filter((step) => step.template.type === ChannelTypeEnum.DIRECT)?.length,
    });

    for (const job of jobs) {
      const firstJob = await this.jobRepository.storeJobs(job);
      await this.workflowQueueService.addJob(firstJob);
    }

    if (command.payload.$on_boarding_trigger && template.name.toLowerCase().includes('on-boarding')) {
      return 'Your first notification was sent! Check your notification bell in the demo dashboard to Continue.';
    }

    return {
      acknowledged: true,
      status: 'processed',
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
}
