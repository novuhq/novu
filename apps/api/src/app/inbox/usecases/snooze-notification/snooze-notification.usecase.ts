import { HttpException, HttpStatus, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import {
  AnalyticsService,
  CloudflareSchedulerService,
  CreateExecutionDetails,
  CreateExecutionDetailsCommand,
  DetailEnum,
  FeatureFlagsService,
  PinoLogger,
  SchedulerJobType,
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
  CloudflareSchedulerMode,
  ExecutionDetailsSourceEnum,
  ExecutionDetailsStatusEnum,
  FeatureNameEnum,
  FeatureFlagsKeysEnum,
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
    private analyticsService: AnalyticsService,
    private cloudflareSchedulerService: CloudflareSchedulerService,
    private featureFlagsService: FeatureFlagsService
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
    this.logger.info({ jobId: job._id, delay }, 'Processing snooze job scheduling');

    const organization = await this.getOrganization(job._organizationId);
    if (!organization) {
      this.logger.warn({ organizationId: job._organizationId }, 'Organization not found, falling back to BullMQ');
      await this.addToBullMQ(job, delay, false);

      return;
    }

    const schedulerMode = await this.featureFlagsService.getFlag<string>({
      key: FeatureFlagsKeysEnum.CF_SCHEDULER_MODE,
      defaultValue: CloudflareSchedulerMode.OFF,
      organization: { _id: job._organizationId, apiServiceLevel: organization.apiServiceLevel },
      environment: { _id: job._environmentId },
    });

    const hasDelay = delay > 0;
    const shouldUseCFScheduler = schedulerMode !== CloudflareSchedulerMode.OFF && hasDelay;

    this.logger.debug(
      {
        jobId: job._id,
        schedulerMode,
        hasDelay,
        shouldUseCFScheduler,
        delay,
      },
      'CF Scheduler mode evaluation for snooze job'
    );

    if (shouldUseCFScheduler) {
      await this.handleCFSchedulerMode(job, delay, schedulerMode as CloudflareSchedulerMode);
    } else {
      await this.addToBullMQ(job, delay, false);
    }
  }

  private async handleCFSchedulerMode(job: JobEntity, delay: number, mode: CloudflareSchedulerMode) {
    const schedulerRequest = {
      jobId: job._id,
      type: SchedulerJobType.SNOOZE,
      delayMs: delay,
      data: {
        _environmentId: job._environmentId,
        _id: job._id,
        _organizationId: job._organizationId,
        _userId: job._userId,
      },
      metadata: {
        mode,
        workflowId: job._templateId,
        subscriberId: job._subscriberId,
        stepId: job.step?.stepId,
      },
    };

    switch (mode) {
      case CloudflareSchedulerMode.SHADOW:
        this.logger.info({ jobId: job._id }, 'Shadow mode: BullMQ will process, CF Scheduler for validation');
        await this.cloudflareSchedulerService.scheduleJob(schedulerRequest);
        await this.addToBullMQ(job, delay, false); // No flag - this is the real one
        break;

      case CloudflareSchedulerMode.LIVE:
        this.logger.info({ jobId: job._id }, 'Live mode: CF Scheduler will process, BullMQ is shadow');
        await this.cloudflareSchedulerService.scheduleJob(schedulerRequest);
        await this.addToBullMQ(job, delay, true); // skipProcessing: true - this is shadow
        break;

      case CloudflareSchedulerMode.COMPLETE:
        this.logger.info({ jobId: job._id }, 'Complete mode: Adding snooze job only to CF Scheduler');
        await this.cloudflareSchedulerService.scheduleJob(schedulerRequest);
        break;

      default:
        this.logger.warn({ mode }, 'Unknown CF Scheduler mode for snooze, falling back to BullMQ');
        await this.addToBullMQ(job, delay, false);
    }
  }

  private async addToBullMQ(job: JobEntity, delay: number, skipProcessing: boolean) {
    const jobData = {
      _environmentId: job._environmentId,
      _id: job._id,
      _organizationId: job._organizationId,
      _userId: job._userId,
      ...(skipProcessing && { skipProcessing: true }),
    };

    this.logger.info(
      { jobId: job._id, delay, skipProcessing },
      skipProcessing ? 'Adding snooze job to BullMQ with skipProcessing flag' : 'Adding snooze job to BullMQ'
    );

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
      contextKeys: command.contextKeys,
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
        contextKeys: command.contextKeys,
      })
    );
  }
}
