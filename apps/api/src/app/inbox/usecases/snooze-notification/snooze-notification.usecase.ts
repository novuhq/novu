import {
  Injectable,
  NotFoundException,
  InternalServerErrorException,
  HttpException,
  NotImplementedException,
  HttpStatus,
} from '@nestjs/common';
import {
  CreateExecutionDetails,
  CreateExecutionDetailsCommand,
  DetailEnum,
  StandardQueueService,
  FeatureFlagsService,
  SYSTEM_LIMITS,
  PinoLogger,
} from '@novu/application-generic';
import {
  JobEntity,
  JobRepository,
  MessageRepository,
  MessageEntity,
  OrganizationEntity,
  EnvironmentEntity,
  UserEntity,
  CommunityOrganizationRepository,
} from '@novu/dal';
import {
  ApiServiceLevelEnum,
  ChannelTypeEnum,
  ExecutionDetailsSourceEnum,
  ExecutionDetailsStatusEnum,
  FeatureFlagsKeysEnum,
  FeatureNameEnum,
  getFeatureForTierAsNumber,
  JobStatusEnum,
} from '@novu/shared';
import { v4 as uuidv4 } from 'uuid';
import { SnoozeNotificationCommand } from './snooze-notification.command';
import { MarkNotificationAs } from '../mark-notification-as/mark-notification-as.usecase';
import { MarkNotificationAsCommand } from '../mark-notification-as/mark-notification-as.command';
import { InboxNotification } from '../../utils/types';

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
    private featureFlagsService: FeatureFlagsService
  ) {}

  public async execute(command: SnoozeNotificationCommand): Promise<InboxNotification> {
    await this.isSnoozeEnabled(command);

    const delayAmountMs = this.calculateDelayInMs(command.snoozeUntil);
    await this.validateDelayDuration(command, delayAmountMs);
    const notification = await this.findNotification(command);

    try {
      let scheduledJob = {} as JobEntity;
      let snoozedNotification = {} as InboxNotification;

      await this.messageRepository.withTransaction(async () => {
        scheduledJob = await this.createScheduledUnsnoozeJob(notification, delayAmountMs);
        snoozedNotification = await this.markNotificationAsSnoozed(command);
        await this.enqueueJob(scheduledJob, delayAmountMs);
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

      return snoozedNotification;
    } catch (error) {
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

  private async isSnoozeEnabled(command: SnoozeNotificationCommand) {
    const isSnoozeEnabled = await this.featureFlagsService.getFlag({
      key: FeatureFlagsKeysEnum.IS_SNOOZE_ENABLED,
      defaultValue: false,
      organization: { _id: command.organizationId } as OrganizationEntity,
      environment: { _id: command.environmentId } as EnvironmentEntity,
      user: { _id: command.subscriberId } as UserEntity,
    });

    if (!isSnoozeEnabled) {
      throw new NotImplementedException();
    }
  }

  private calculateDelayInMs(snoozeUntil: Date): number {
    return snoozeUntil.getTime() - new Date().getTime();
  }

  private async validateDelayDuration(command: SnoozeNotificationCommand, delay: number) {
    const tierLimit = await this.getTierLimit(command);

    if (tierLimit === 0) {
      throw new HttpException(
        {
          message: 'Feature Not Available',
          reason: 'Snooze functionality is not available on your current plan. Please upgrade to access this feature.',
        },
        HttpStatus.PAYMENT_REQUIRED
      );
    }

    if (delay > tierLimit) {
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

  private async getTierLimit(command: SnoozeNotificationCommand) {
    const systemLimitMs = await this.featureFlagsService.getFlag({
      key: FeatureFlagsKeysEnum.MAX_DEFER_DURATION_IN_MS_NUMBER,
      defaultValue: SYSTEM_LIMITS.DEFER_DURATION_MS,
      environment: { _id: command.environmentId },
      organization: { _id: command.organizationId },
    });

    /**
     * If the system limit is not the default, we need to use it as the limit
     * for the specific customer exceptions from the tier limit
     */
    const isSpecialLimit = systemLimitMs !== SYSTEM_LIMITS.DEFER_DURATION_MS;
    if (isSpecialLimit) {
      return systemLimitMs;
    }

    const organization = await this.organizationRepository.findOne({
      _id: command.organizationId,
    });

    const tierLimitMs = getFeatureForTierAsNumber(
      FeatureNameEnum.PLATFORM_MAX_SNOOZE_DURATION,
      organization?.apiServiceLevel || ApiServiceLevelEnum.FREE,
      true
    );

    return Math.min(systemLimitMs, tierLimitMs);
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
