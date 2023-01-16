import { JobEntity, JobRepository, NotificationTemplateRepository, NotificationRepository } from '@novu/dal';
import { Inject, Injectable } from '@nestjs/common';
import { StepTypeEnum, ExecutionDetailsSourceEnum, ExecutionDetailsStatusEnum } from '@novu/shared';
import * as Sentry from '@sentry/node';

import { TriggerEventCommand } from './trigger-event.command';
import { CreateLog } from '../../../logs/usecases';
import { AnalyticsService } from '../../../shared/services/analytics/analytics.service';
import { ProcessSubscriber } from '../process-subscriber/process-subscriber.usecase';
import { ProcessSubscriberCommand } from '../process-subscriber/process-subscriber.command';
import { ANALYTICS_SERVICE } from '../../../shared/shared.module';
import { ApiException } from '../../../shared/exceptions/api.exception';
import { VerifyPayload } from '../verify-payload/verify-payload.usecase';
import { AddJob } from '../add-job/add-job.usecase';
import { CreateExecutionDetails } from '../../../execution-details/usecases/create-execution-details/create-execution-details.usecase';
import {
  CreateExecutionDetailsCommand,
  DetailEnum,
} from '../../../execution-details/usecases/create-execution-details/create-execution-details.command';

@Injectable()
export class TriggerEvent {
  constructor(
    private notificationTemplateRepository: NotificationTemplateRepository,
    private createLogUsecase: CreateLog,
    private processSubscriber: ProcessSubscriber,
    private jobRepository: JobRepository,
    private verifyPayload: VerifyPayload,
    @Inject(ANALYTICS_SERVICE) private analyticsService: AnalyticsService,
    private addJobUsecase: AddJob,
    private notificationRepository: NotificationRepository,
    protected createExecutionDetails: CreateExecutionDetails
  ) {}

  async execute(command: TriggerEventCommand) {
    await this.validateTransactionIdProperty(command.transactionId, command.organizationId, command.environmentId);

    const template = await this.notificationTemplateRepository.findByTriggerIdentifier(
      command.environmentId,
      command.identifier
    );

    Sentry.addBreadcrumb({
      message: 'Sending trigger',
      data: {
        triggerIdentifier: command.identifier,
      },
    });

    const jobs: Omit<JobEntity, '_id'>[][] = [];

    for (const subscriberToTrigger of command.to) {
      jobs.push(
        await this.processSubscriber.execute(
          ProcessSubscriberCommand.create({
            identifier: command.identifier,
            payload: command.payload,
            overrides: command.overrides,
            to: subscriberToTrigger,
            transactionId: command.transactionId,
            environmentId: command.environmentId,
            organizationId: command.organizationId,
            userId: command.organizationId,
            templateId: template._id,
            actor: command.actor,
            template,
          })
        )
      );
    }

    for (const job of jobs) {
      await this.storeAndAddJob(job);
    }
  }

  private async storeAndAddJob(jobs: Omit<JobEntity, '_id'>[]) {
    const storedJobs = await this.jobRepository.storeJobs(jobs);
    const channels = storedJobs
      .map((item) => item.type as StepTypeEnum)
      .reduce<StepTypeEnum[]>((list, channel) => {
        if (list.includes(channel) || channel === StepTypeEnum.TRIGGER) {
          return list;
        }
        list.push(channel);

        return list;
      }, []);

    for (const job of storedJobs) {
      this.createExecutionDetails.execute(
        CreateExecutionDetailsCommand.create({
          ...CreateExecutionDetailsCommand.getDetailsFromJob(job),
          detail: DetailEnum.STEP_CREATED,
          source: ExecutionDetailsSourceEnum.INTERNAL,
          status: ExecutionDetailsStatusEnum.PENDING,
          isTest: false,
          isRetry: false,
        })
      );
    }

    const firstJob = storedJobs[0];

    await this.notificationRepository.update(
      {
        _organizationId: firstJob._organizationId,
        _id: firstJob._notificationId,
      },
      {
        $set: {
          channels: channels,
        },
      }
    );

    await this.addJobUsecase.execute({
      userId: firstJob._userId,
      environmentId: firstJob._environmentId,
      organizationId: firstJob._organizationId,
      jobId: firstJob._id,
      job: firstJob,
    });
  }

  public async validateTransactionIdProperty(
    transactionId: string,
    organizationId: string,
    environmentId: string
  ): Promise<boolean> {
    const found = await this.jobRepository.count({
      transactionId,
      _organizationId: organizationId,
      _environmentId: environmentId,
    });

    if (found) {
      throw new ApiException(
        'transactionId property is not unique, please make sure all triggers have a unique transactionId'
      );
    }

    return true;
  }
}
