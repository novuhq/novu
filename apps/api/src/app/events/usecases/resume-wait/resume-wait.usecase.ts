import { BadRequestException, Injectable } from '@nestjs/common';
import { PinoLogger, StandardQueueService } from '@novu/application-generic';
import { JobEntity, JobRepository, JobStatusEnum, TopicRepository, TopicSubscribersRepository } from '@novu/dal';
import {
  ISubscribersDefine,
  ITopic,
  StepTypeEnum,
  TriggerRecipient,
  TriggerRecipientsPayload,
  TriggerRecipientsTypeEnum,
} from '@novu/shared';
import { ResumeWaitCommand } from './resume-wait.command';

@Injectable()
export class ResumeWait {
  constructor(
    private jobRepository: JobRepository,
    private standardQueueService: StandardQueueService,
    private topicRepository: TopicRepository,
    private topicSubscribersRepository: TopicSubscribersRepository,
    private logger: PinoLogger
  ) {
    this.logger.setContext(this.constructor.name);
  }

  public async execute(command: ResumeWaitCommand): Promise<{ resumed: boolean }> {
    const subscriberIds = await this.resolveSubscriberIds(command);

    if (subscriberIds.length === 0) {
      throw new BadRequestException('to must resolve to at least one recipient');
    }

    const jobs = await this.jobRepository.find({
      _environmentId: command.environmentId,
      transactionId: command.transactionId,
      type: StepTypeEnum.WAIT,
      status: JobStatusEnum.DELAYED,
      subscriberId: { $in: subscriberIds },
      $or: [{ 'step.stepId': command.stepId }, { 'step.uuid': command.stepId }],
    });

    if (!jobs.length) {
      return { resumed: false };
    }

    const stepOutput = {
      status: 'resumed',
      ...(command.data ? { data: command.data } : {}),
    };
    let resumedCount = 0;

    for (const job of jobs) {
      const updated = await this.jobRepository.update(
        {
          _id: job._id,
          _environmentId: command.environmentId,
          status: JobStatusEnum.DELAYED,
        },
        {
          $set: { stepOutput },
        }
      );

      if (!updated.modified) {
        continue;
      }

      await this.enqueueResume(job);
      resumedCount += 1;
    }

    return { resumed: resumedCount > 0 };
  }

  private async enqueueResume(job: JobEntity): Promise<void> {
    await this.standardQueueService.add({
      name: job._id,
      data: {
        _environmentId: job._environmentId,
        _id: job._id,
        _organizationId: job._organizationId,
        _userId: job._userId,
      },
      groupId: job._organizationId,
      options: {
        delay: 0,
        jobId: `${job._id}-resume`,
      },
    });
  }

  private async resolveSubscriberIds(command: ResumeWaitCommand): Promise<string[]> {
    const recipients = normalizeRecipients(command.to);
    const subscriberIds = new Set<string>();

    for (const recipient of recipients) {
      if (typeof recipient === 'string') {
        subscriberIds.add(recipient);
        continue;
      }

      if (isTopicRecipient(recipient)) {
        const topicSubscriberIds = await this.resolveTopicSubscriberIds(
          command,
          recipient.topicKey,
          recipient.exclude ?? []
        );

        for (const subscriberId of topicSubscriberIds) {
          subscriberIds.add(subscriberId);
        }
        continue;
      }

      if (isSubscriberRecipient(recipient)) {
        subscriberIds.add(recipient.subscriberId);
      }
    }

    return [...subscriberIds];
  }

  private async resolveTopicSubscriberIds(
    command: ResumeWaitCommand,
    topicKey: string,
    exclude: string[]
  ): Promise<string[]> {
    const topic = await this.topicRepository.findTopicByKey(topicKey, command.organizationId, command.environmentId);
    if (!topic) {
      return [];
    }

    const subscriptions = await this.topicSubscribersRepository.findSubscribersByTopicId(
      command.environmentId,
      command.organizationId,
      topic._id
    );
    const excluded = new Set(exclude);

    return subscriptions
      .map((subscription) => subscription.externalSubscriberId)
      .filter((subscriberId): subscriberId is string => Boolean(subscriberId) && !excluded.has(subscriberId));
  }
}

function normalizeRecipients(to: TriggerRecipientsPayload): TriggerRecipient[] {
  return Array.isArray(to) ? to : [to];
}

function isTopicRecipient(recipient: TriggerRecipient): recipient is ITopic {
  if (typeof recipient === 'string') {
    return false;
  }

  if ('type' in recipient && recipient.type === TriggerRecipientsTypeEnum.TOPIC) {
    return true;
  }

  return 'topicKey' in recipient && typeof recipient.topicKey === 'string';
}

function isSubscriberRecipient(recipient: TriggerRecipient): recipient is ISubscribersDefine {
  return typeof recipient !== 'string' && 'subscriberId' in recipient && typeof recipient.subscriberId === 'string';
}
