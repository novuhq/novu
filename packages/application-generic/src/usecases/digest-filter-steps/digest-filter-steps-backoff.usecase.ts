import { Injectable } from '@nestjs/common';
import {
  JobStatusEnum,
  JobRepository,
  NotificationStepEntity,
  NotificationRepository,
} from '@novu/dal';
import { IDigestRegularMetadata, StepTypeEnum } from '@novu/shared';
import { sub } from 'date-fns';

import { DigestFilterStepsCommand } from './digest-filter-steps.command';
import { getNestedValue } from '../../utils/object';

@Injectable()
export class DigestFilterStepsBackoff {
  constructor(
    private jobRepository: JobRepository,
    private notificationRepository: NotificationRepository
  ) {}

  public async execute(
    command: DigestFilterStepsCommand
  ): Promise<NotificationStepEntity[]> {
    const steps: NotificationStepEntity[] = [];

    for (const step of command.steps) {
      if (step.template?.type !== StepTypeEnum.DIGEST) {
        steps.push(step);
        continue;
      }

      const metadata = step.metadata as IDigestRegularMetadata | undefined;
      const trigger = await this.getTrigger(command, metadata);
      if (!trigger) {
        continue;
      }

      const haveDigest = await this.alreadyHaveDigest(command, metadata);
      if (haveDigest) {
        return steps;
      }

      steps.push(step);
    }

    return steps;
  }

  private getBackoffDate(metadata: IDigestRegularMetadata | undefined) {
    return sub(new Date(), {
      [metadata?.backoffUnit as string]: metadata?.backoffAmount,
    });
  }

  private getTrigger(
    command: DigestFilterStepsCommand,
    metadata: IDigestRegularMetadata | undefined
  ) {
    const query = {
      updatedAt: {
        $gte: this.getBackoffDate(metadata),
      },
      _templateId: command.templateId,
      status: JobStatusEnum.COMPLETED,
      type: StepTypeEnum.TRIGGER,
      _environmentId: command.environmentId,
      _subscriberId: command._subscriberId,
    };

    const digestKey = metadata?.digestKey;
    if (digestKey) {
      query['payload.' + digestKey] = getNestedValue(
        command.payload,
        digestKey
      );
    }

    return this.jobRepository.findOne(query);
  }

  private async alreadyHaveDigest(
    command: DigestFilterStepsCommand,
    metadata: IDigestRegularMetadata | undefined
  ): Promise<boolean> {
    const query = {
      updatedAt: {
        $gte: this.getBackoffDate(metadata),
      },
      _templateId: command.templateId,
      type: StepTypeEnum.DIGEST,
      _environmentId: command.environmentId,
      _subscriberId: command._subscriberId,
    };

    if (metadata?.digestKey) {
      query['payload.' + metadata.digestKey] =
        command.payload[metadata.digestKey];
    }

    const digest = await this.jobRepository.findOne(query);

    const haveDigests = digest !== null;

    if (haveDigests) {
      await this.notificationRepository.update(
        {
          _environmentId: command.environmentId,
          _id: command.notificationId,
        },
        {
          $set: {
            _digestedNotificationId: digest._notificationId,
            expireAt: digest.expireAt,
          },
        }
      );
    }

    return haveDigests;
  }
}
