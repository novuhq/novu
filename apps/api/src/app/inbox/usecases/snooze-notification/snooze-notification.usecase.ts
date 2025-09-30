import { HttpException, HttpStatus, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import {
  AnalyticsService,
  CreateExecutionDetails,
  CreateExecutionDetailsCommand,
  DetailEnum,
  PinoLogger,
  StandardQueueService,
} from '@novu/application-generic';
import {
  CommunityOrganizationRepository,
  JobEntity,
  JobRepository,
  MessageEntity,
  MessageRepository,
  OrganizationEntity,
} from '@novu/dal';
import {
  ApiServiceLevelEnum,
  ChannelTypeEnum,
  ExecutionDetailsSourceEnum,
  ExecutionDetailsStatusEnum,
  FeatureNameEnum,
  getFeatureForTierAsNumber,
  JobStatusEnum,
} from '@novu/shared';
import { v4 as uuidv4 } from 'uuid';
import { AnalyticsEventsEnum } from '../../utils';
import { InboxNotification } from '../../utils/types';
import { MarkNotificationAsCommand } from '../mark-notification-as/mark-notification-as.command';
import { MarkNotificationAs } from '../mark-notification-as/mark-notification-as.usecase';
import { SnoozeNotificationCommand } from './snooze-notification.command';

@Injectable()
export class SnoozeNotification {
  private readonly RETRY_ATTEMPTS = 3;

  constructor(
    private readonly logger: PinoLogger,
    private messageRepository: MessageRepository,
    private jobRepository: JobRepository,
    private standardQueueService: StandardQueueService,
    private organizationRepository: CommunityOrganizationRepository,
    private createExecutionDetails: CreateExecutionDetails,
    private markNotificationAs: MarkNotificationAs,
    private analyticsService: AnalyticsService
  ) {}

  public async execute(command: SnoozeNotificationCommand): Promise<InboxNotification> {
    const snoozeDurationMs = this.calculateDelayInMs(command.snoozeUntil);
    await this.validateSnoozeDuration(command, snoozeDurationMs);
    const notification = await this.findNotification(command);

    try {
      let scheduledJob = {} as JobEntity;
      let snoozedNotification = {} as InboxNotification;

      await this.messageRepository.withTransaction(async () => {
        scheduledJob = await this.createScheduledUnsnoozeJob(notification, snoozeDurationMs);
        snoozedNotification = await this.markNotificationAsSnoozed(command);
        await this.enqueueJob(scheduledJob, snoozeDurationMs);
      });

      // fire and forget
      this.createExecutionDetails
        .execute(
          CreateExecutionDetailsCommand.create({
            ...CreateExecutionDetailsCommand.getDetailsFromJob(scheduledJob),
            detail: DetailEnum.MESSAGE_SNOOZED,
            source: ExecutionDetailsSourceEnum.INTERNAL,
            status: ExecutionDetailsStatusEnum.PENDING,
            isTest: false,
            isRetry: false,
          })
        )
        .catch((error) => {
          this.logger.error({ err: error }, 'Failed to create execution details');
        });

      this.analyticsService.mixpanelTrack(AnalyticsEventsEnum.SNOOZE_NOTIFICATION, '', {
        _organization: command.organizationId,
        _notification: command.notificationId,
        _subscriber: notification._subscriberId,
        snoozeUntil: command.snoozeUntil,
      });

      return snoozedNotification;
    } catch (error) {
      this.logger.error({ error }, 'Failed to snooze notification');
      throw new InternalServerErrorException(`Failed to snooze notification: ${error.message}`);
    }
  }

  public async enqueueJob(job: JobEntity, delay: number) {
    this.logger.info({ jobId: job._id, delay }, 'Adding snooze job to Standard Queue');

    const jobData = {
      _environmentId: job._environmentId,
      _id: job._id,
      _organizationId: job._organizationId,
      _userId: job._userId,
    };

    await this.standardQueueService.add({
      name: job._id,
      data: jobData,
      groupId: job._organizationId,
      options: { delay, attempts: this.RETRY_ATTEMPTS, backoff: { type: 'exponential', delay: 5000 } },
    });
  }

  private async validateSnoozeDuration(command: SnoozeNotificationCommand, snoozeDurationMs: number) {
    const organization = await this.getOrganization(command.organizationId);

    const tierLimitMs = getFeatureForTierAsNumber(
      FeatureNameEnum.PLATFORM_MAX_SNOOZE_DURATION,
      organization?.apiServiceLevel || ApiServiceLevelEnum.FREE,
      true
    );

    if (snoozeDurationMs > tierLimitMs) {
      throw new HttpException(
        {
          message: 'Snooze Duration Limit Exceeded',
          reason:
            'The snooze duration you selected exceeds your current plan limit. ' +
            'Please upgrade your plan for extended snooze durations.',
        },
        HttpStatus.PAYMENT_REQUIRED
      );
    }
  }

  private calculateDelayInMs(snoozeUntil: Date): number {
    return snoozeUntil.getTime() - new Date().getTime();
  }

  private async getOrganization(organizationId: string): Promise<OrganizationEntity> {
    const organization = await this.organizationRepository.findOne({
      _id: organizationId,
    });

    if (!organization) {
      throw new NotFoundException(`Organization id: '${organizationId}' not found`);
    }

    return organization;
  }

  private async findNotification(command: SnoozeNotificationCommand): Promise<MessageEntity> {
    const message = await this.messageRepository.findOne({
      _environmentId: command.environmentId,
      channel: ChannelTypeEnum.IN_APP,
      _id: command.notificationId,
    });

    if (!message) {
      throw new NotFoundException(`Notification id: '${command.notificationId}' not found`);
    }

    return message;
  }

  private async createScheduledUnsnoozeJob(notification: MessageEntity, delay: number): Promise<JobEntity> {
    const originalJob = await this.jobRepository.findOne({
      _id: notification._jobId,
      _environmentId: notification._environmentId,
    });

    if (!originalJob) {
      throw new InternalServerErrorException(`Job id: '${notification._jobId}' not found`);
    }

    const newJobData = {
      ...originalJob,
      transactionId: uuidv4(),
      status: JobStatusEnum.PENDING,
      delay,
      createdAt: Date.now().toString(),
      id: JobRepository.createObjectId(),
      _parentId: null,
      payload: {
        ...originalJob.payload,
        unsnooze: true,
      },
    };

    return this.jobRepository.create(newJobData);
  }

  private async markNotificationAsSnoozed(command: SnoozeNotificationCommand) {
    return this.markNotificationAs.execute(
      MarkNotificationAsCommand.create({
        environmentId: command.environmentId,
        organizationId: command.organizationId,
        subscriberId: command.subscriberId,
        notificationId: command.notificationId,
        snoozedUntil: command.snoozeUntil,
      })
    );
  }
}
