import {
  Injectable,
  Logger,
  NotFoundException,
  InternalServerErrorException,
  HttpException,
  NotImplementedException,
} from '@nestjs/common';
import {
  CreateExecutionDetails,
  CreateExecutionDetailsCommand,
  DetailEnum,
  StandardQueueService,
  FeatureFlagsService,
  SYSTEM_LIMITS,
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
import { Types } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import { SnoozeNotificationCommand } from './snooze-notification.command';
import { MarkNotificationAs } from '../mark-notification-as/mark-notification-as.usecase';
import { MarkNotificationAsCommand } from '../mark-notification-as/mark-notification-as.command';
import { InboxNotification } from '../../utils/types';

@Injectable()
export class SnoozeNotification {
  private readonly logger = new Logger(SnoozeNotification.name);
  private readonly RETRY_ATTEMPTS = 3;

  constructor(
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

    const notification = await this.findNotification(command);
    const delayAmount = this.calculateDelayInMs(command.snoozeUntil);
    await this.validateDelayDuration(command, delayAmount);

    try {
      let scheduledJob = {} as JobEntity;
      let snoozedNotification = {} as InboxNotification;

      await this.messageRepository.withTransaction(async () => {
        scheduledJob = await this.createScheduledUnsnoozeJob(notification, delayAmount);
        snoozedNotification = await this.markNotificationAsSnoozed(command);
        await this.queueJob(scheduledJob, delayAmount);
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
          this.logger.error(`Failed to create execution details: ${error.message}`, error.stack);
        });

      return snoozedNotification;
    } catch (error) {
      throw new InternalServerErrorException(`Failed to snooze notification: ${error.message}`);
    }
  }

  public async queueJob(job: JobEntity, delay: number) {
    this.logger.verbose(`Adding snooze job ${job._id} to Standard Queue`);

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

    // TODO: add per environment feature on/off on integration settings
  }

  private calculateDelayInMs(snoozeUntil: Date): number {
    return snoozeUntil.getTime() - new Date().getTime();
  }

  private async validateDelayDuration(command: SnoozeNotificationCommand, delay: number) {
    const tierLimit = await this.getTierLimit(command);

    if (delay > tierLimit) {
      throw new HttpException('Payment Required', 402);
    }
  }

  private async getTierLimit(command: SnoozeNotificationCommand) {
    const organization = await this.organizationRepository.findOne({
      _id: command.organizationId,
    });

    const systemLimitMs = await this.featureFlagsService.getFlag({
      key: FeatureFlagsKeysEnum.MAX_DEFER_DURATION_IN_MS_NUMBER,
      defaultValue: SYSTEM_LIMITS.DEFER_DURATION_MS,
      environment: { _id: command.environmentId },
      organization: { _id: command.organizationId },
    });

    const isSpecialLimit = systemLimitMs !== SYSTEM_LIMITS.DEFER_DURATION_MS;
    if (isSpecialLimit) {
      return systemLimitMs;
    }

    const tierLimitMs = getFeatureForTierAsNumber(
      FeatureNameEnum.PLATFORM_MAX_SNOOZE_DURATION,
      organization?.apiServiceLevel || ApiServiceLevelEnum.FREE,
      true
    );

    return Math.min(systemLimitMs, tierLimitMs);
  }

  private async findNotification(command: SnoozeNotificationCommand): Promise<MessageEntity> {
    const message = await this.messageRepository.findOne({
      _subscriberId: command.subscriberId,
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
      id: new Types.ObjectId(),
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
        snoozedUntilDate: command.snoozeUntil,
      })
    );
  }
}
