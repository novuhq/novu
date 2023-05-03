import { Injectable } from '@nestjs/common';
import {
  JobStatusEnum,
  JobRepository,
  NotificationStepEntity,
  NotificationRepository,
} from '@novu/dal';
import { StepTypeEnum } from '@novu/shared';

import { DigestFilterStepsCommand } from './digest-filter-steps.command';
import { DigestFilterSteps } from './digest-filter-steps.usecase';

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
        delayedDigests = await this.getDigest(command, step);
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
    step: NotificationStepEntity
  ) {
    const where = {
      status: JobStatusEnum.DELAYED,
      type: StepTypeEnum.DIGEST,
      _subscriberId: command._subscriberId,
      _templateId: command.templateId,
      _environmentId: command.environmentId,
    };

    const digestKey = step?.metadata?.digestKey;
    if (digestKey) {
      where['payload.' + digestKey] = DigestFilterSteps.getNestedValue(
        command.payload,
        digestKey
      );
    }

    return await this.jobRepository.findOne(where);
  }
}
