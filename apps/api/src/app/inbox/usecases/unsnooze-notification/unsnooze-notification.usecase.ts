import {
  MessageRepository,
  JobRepository,
  JobStatusEnum,
  ChannelTypeEnum,
  JobEntity,
  UserEntity,
  OrganizationEntity,
  EnvironmentEntity,
} from '@novu/dal';
import { Injectable, NotFoundException, InternalServerErrorException, NotImplementedException } from '@nestjs/common';
import {
  CreateExecutionDetails,
  CreateExecutionDetailsCommand,
  DetailEnum,
  FeatureFlagsService,
  PinoLogger,
} from '@novu/application-generic';
import { ExecutionDetailsSourceEnum, ExecutionDetailsStatusEnum, FeatureFlagsKeysEnum } from '@novu/shared';
import { UnsnoozeNotificationCommand } from './unsnooze-notification.command';
import { MarkNotificationAsCommand } from '../mark-notification-as/mark-notification-as.command';
import { MarkNotificationAs } from '../mark-notification-as/mark-notification-as.usecase';
import { InboxNotification } from '../../utils/types';

@Injectable()
export class UnsnoozeNotification {
  constructor(
    private readonly logger: PinoLogger,
    private messageRepository: MessageRepository,
    private jobRepository: JobRepository,
    private markNotificationAs: MarkNotificationAs,
    private createExecutionDetails: CreateExecutionDetails,
    private featureFlagsService: FeatureFlagsService
  ) {}

  async execute(command: UnsnoozeNotificationCommand): Promise<InboxNotification> {
    await this.isSnoozeEnabled(command);

    const snoozedNotification = await this.messageRepository.findOne({
      _id: command.notificationId,
      _environmentId: command.environmentId,
      channel: ChannelTypeEnum.IN_APP,
      snoozedUntil: { $exists: true, $ne: null },
    });

    if (!snoozedNotification) {
      throw new NotFoundException(
        `Could not find a snoozed notification with id '${command.notificationId}'. ` +
          'The notification may not exist or may not be in a snoozed state.'
      );
    }

    try {
      return this.unsnoozeNotification(command, snoozedNotification._notificationId);
    } catch (error) {
      this.logger.error({ err: error }, `Failed to unsnooze notification: ${command.notificationId}`);
      throw new InternalServerErrorException(`Failed to unsnooze notification: ${error.message}`);
    }
  }

  private async unsnoozeNotification(
    command: UnsnoozeNotificationCommand,
    notificationId: string
  ): Promise<InboxNotification> {
    let scheduledJob: JobEntity | null = null;
    let unsnoozedNotification!: InboxNotification;

    await this.messageRepository.withTransaction(async () => {
      scheduledJob = await this.jobRepository.findOneAndDelete({
        _notificationId: notificationId,
        _environmentId: command.environmentId,
        delay: { $exists: true },
        status: JobStatusEnum.PENDING,
        'payload.unsnooze': true,
      });

      unsnoozedNotification = await this.markNotificationAs.execute(
        MarkNotificationAsCommand.create({
          environmentId: command.environmentId,
          organizationId: command.organizationId,
          subscriberId: command.subscriberId,
          notificationId: command.notificationId,
          snoozedUntil: null,
        })
      );
    });

    if (scheduledJob) {
      // fire and forget
      this.createExecutionDetails
        .execute(
          CreateExecutionDetailsCommand.create({
            ...CreateExecutionDetailsCommand.getDetailsFromJob(scheduledJob),
            detail: DetailEnum.MESSAGE_UNSNOOZED,
            source: ExecutionDetailsSourceEnum.INTERNAL,
            status: ExecutionDetailsStatusEnum.SUCCESS,
            isTest: false,
            isRetry: false,
          })
        )
        .catch((error) => {
          this.logger.error({ err: error }, 'Failed to create execution details');
        });
    } else {
      this.logger.error(
        `Could not find a scheduled job for snoozed notification '${notificationId}'. ` +
          'The notification may have already been unsnoozed or the scheduled job was deleted.'
      );
    }

    return unsnoozedNotification;
  }

  private async isSnoozeEnabled(command: UnsnoozeNotificationCommand) {
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
}
