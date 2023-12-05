import { Injectable } from '@nestjs/common';
import {
  JobStatusEnum,
  JobRepository,
  NotificationStepEntity,
  NotificationRepository,
} from '@novu/dal';
import {
  IDigestTimedMetadata,
  StepTypeEnum,
  DigestTypeEnum,
} from '@novu/shared';

import { DigestFilterStepsCommand } from './digest-filter-steps.command';
import { getNestedValue } from '../../utils/object';

@Injectable()
export class DigestFilterStepsTimed {
  constructor(
    private jobRepository: JobRepository,
    private notificationRepository: NotificationRepository
  ) {}

  public async execute(
    command: DigestFilterStepsCommand
  ): Promise<NotificationStepEntity[]> {
    const steps: NotificationStepEntity[] = [];

    for (const step of command.steps) {
      if (step?.template?.type !== StepTypeEnum.DIGEST) {
        steps.push(step);
        continue;
      }

      const metadata = step.metadata as IDigestTimedMetadata | undefined;
      const hasDelayedTimedDigest = await this.hasDelayedTimedDigest(
        command,
        metadata
      );
      if (hasDelayedTimedDigest) {
        return steps;
      }

      steps.push(step);
    }

    return steps;
  }

  private async hasDelayedTimedDigest(
    command: DigestFilterStepsCommand,
    metadata: IDigestTimedMetadata | undefined
  ) {
    const where = {
      status: JobStatusEnum.DELAYED,
      type: StepTypeEnum.DIGEST,
      _subscriberId: command._subscriberId,
      _templateId: command.templateId,
      _environmentId: command.environmentId,
      'digest.type': DigestTypeEnum.TIMED,
    };

    const digestKey = metadata?.digestKey;
    if (digestKey) {
      where['payload.' + digestKey] = getNestedValue(
        command.payload,
        digestKey
      );
    }

    const timedDigest = await this.jobRepository.findOne(where);
    if (timedDigest) {
      await this.notificationRepository.update(
        {
          _environmentId: command.environmentId,
          _id: command.notificationId,
        },
        {
          $set: {
            _digestedNotificationId: timedDigest._notificationId,
            expireAt: timedDigest.expireAt,
          },
        }
      );
    }

    return timedDigest !== null;
  }
}
