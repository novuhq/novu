import { Injectable, NotFoundException } from '@nestjs/common';
import {
  buildFeedKey,
  buildMessageCountKey,
  CreateExecutionDetails,
  CreateExecutionDetailsCommand,
  DetailEnum,
  InvalidateCacheService,
  PlatformException,
  WebSocketsQueueService,
} from '@novu/application-generic';
import { JobRepository, MessageRepository } from '@novu/dal';
import {
  ChannelTypeEnum,
  ExecutionDetailsSourceEnum,
  ExecutionDetailsStatusEnum,
  WebSocketEventEnum,
} from '@novu/shared';
import { ProcessUnsnoozeJobCommand } from './process-unsnooze-job.command';

@Injectable()
export class ProcessUnsnoozeJob {
  constructor(
    private readonly jobRepository: JobRepository,
    private readonly messageRepository: MessageRepository,
    private readonly webSocketsQueueService: WebSocketsQueueService,
    private readonly createExecutionDetails: CreateExecutionDetails,
    private readonly invalidateCache: InvalidateCacheService
  ) {}

  public async execute(command: ProcessUnsnoozeJobCommand) {
    const job = await this.jobRepository.findOne({ _id: command.jobId, _environmentId: command.environmentId });

    if (!job) {
      throw new NotFoundException(`Could not find a job with id '${command.jobId}'.`);
    }

    try {
      const snoozedNotification = await this.messageRepository.findOne({
        _notificationId: job._notificationId,
        _environmentId: job._environmentId,
        channel: ChannelTypeEnum.IN_APP,
        snoozedUntil: { $exists: true, $ne: null },
      });

      if (!snoozedNotification) {
        throw new NotFoundException(
          `Could not find a snoozed notification with id '${job._notificationId}'. ` +
            'The notification may not exist or may not be in a snoozed state.'
        );
      }

      const nowDate = new Date();
      const createdAtDate = new Date(snoozedNotification.createdAt);

      await this.messageRepository.update(
        { _environmentId: job._environmentId, _notificationId: job._notificationId },
        [
          {
            $set: {
              snoozedUntil: null,
              createdAt: nowDate,
              read: false,
              lastReadDate: null,
              deliveredAt: {
                $cond: {
                  if: { $isArray: '$deliveredAt' },
                  then: { $concatArrays: ['$deliveredAt', [nowDate]] },
                  else: [createdAtDate, nowDate],
                },
              },
            },
          },
        ],
        {
          timestamps: false,
          strict: false,
        }
      );

      await Promise.all([
        this.webSocketsQueueService.add({
          name: 'sendMessage',
          data: {
            event: WebSocketEventEnum.RECEIVED,
            userId: job._subscriberId,
            _environmentId: job._environmentId,
            payload: {
              messageId: snoozedNotification._id,
            },
          },
          options: {
            removeOnComplete: true,
            removeOnFail: true,
          },
          groupId: job._organizationId,
        }),
        this.invalidateCache.invalidateQuery({
          key: buildFeedKey().invalidate({
            subscriberId: job.subscriberId,
            _environmentId: job._environmentId,
          }),
        }),
        this.invalidateCache.invalidateQuery({
          key: buildMessageCountKey().invalidate({
            subscriberId: job.subscriberId,
            _environmentId: job._environmentId,
          }),
        }),
      ]);

      await this.createExecutionDetails.execute(
        CreateExecutionDetailsCommand.create({
          ...CreateExecutionDetailsCommand.getDetailsFromJob(job),
          detail: DetailEnum.MESSAGE_UNSNOOZED,
          source: ExecutionDetailsSourceEnum.INTERNAL,
          status: ExecutionDetailsStatusEnum.SUCCESS,
          isTest: false,
          isRetry: false,
        })
      );
    } catch (error) {
      await this.createExecutionDetails.execute(
        CreateExecutionDetailsCommand.create({
          ...CreateExecutionDetailsCommand.getDetailsFromJob(job),
          detail: DetailEnum.MESSAGE_UNSNOOZE_FAILED,
          source: ExecutionDetailsSourceEnum.INTERNAL,
          status: ExecutionDetailsStatusEnum.FAILED,
          isTest: false,
          isRetry: false,
          raw: JSON.stringify({ error: error.message }),
        })
      );
      throw new PlatformException(`Failed to unsnooze notification: ${error.message}`);
    }
  }
}
