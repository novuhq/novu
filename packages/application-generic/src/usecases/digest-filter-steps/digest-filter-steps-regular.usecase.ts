import { Injectable } from '@nestjs/common';
import {
  JobStatusEnum,
  JobRepository,
  NotificationStepEntity,
  NotificationRepository,
} from '@novu/dal';
import { IDigestRegularMetadata, StepTypeEnum } from '@novu/shared';

import { DigestFilterStepsCommand } from './digest-filter-steps.command';
import { getNestedValue } from '../../utils/object';

@Injectable()
export class DigestFilterStepsRegular {
  constructor(
    private jobRepository: JobRepository,
    private notificationRepository: NotificationRepository
  ) {}

  public async execute(
    command: DigestFilterStepsCommand
  ): Promise<NotificationStepEntity[]> {
    const steps: NotificationStepEntity[] = [];
    let delayedDigests;

    for (const step of command.steps) {
      if (step?.template?.type === StepTypeEnum.DIGEST) {
        const metadata = step.metadata as IDigestRegularMetadata | undefined;
        delayedDigests = await this.getDigest(command, metadata);
      }

      steps.push(step);
    }

    if (delayedDigests) {
      await this.notificationRepository.update(
        {
          _environmentId: command.environmentId,
          _id: command.notificationId,
        },
        {
          $set: {
            _digestedNotificationId: delayedDigests._notificationId,
            expireAt: delayedDigests.expireAt,
          },
        }
      );
    }

    return steps;
  }

  private async getDigest(
    command: DigestFilterStepsCommand,
    metadata: IDigestRegularMetadata | undefined
  ) {
    const where = {
      status: JobStatusEnum.DELAYED,
      type: StepTypeEnum.DIGEST,
      _subscriberId: command._subscriberId,
      _templateId: command.templateId,
      _environmentId: command.environmentId,
    };

    const digestKey = metadata?.digestKey;
    if (digestKey) {
      where['payload.' + digestKey] = getNestedValue(
        command.payload,
        digestKey
      );
    }

    return await this.jobRepository.findOne(where);
  }
}
