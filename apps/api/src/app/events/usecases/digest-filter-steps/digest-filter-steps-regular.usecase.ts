import { Injectable } from '@nestjs/common';
import { JobEntity, JobStatusEnum, JobRepository, NotificationStepEntity, NotificationRepository } from '@novu/dal';
import { StepTypeEnum } from '@novu/shared';
import { DigestFilterStepsCommand } from './digest-filter-steps.command';
import { DigestFilterSteps } from './digest-filter-steps.usecase';

@Injectable()
export class DigestFilterStepsRegular {
  constructor(private jobRepository: JobRepository, private notificationRepository: NotificationRepository) {}

  public async execute(command: DigestFilterStepsCommand): Promise<NotificationStepEntity[]> {
    const steps = [DigestFilterSteps.createTriggerStep(command)];
    let delayedDigests: JobEntity = null;
    for (const step of command.steps) {
      if (step.template.type === StepTypeEnum.DIGEST) {
        delayedDigests = await this.getDigest(command, step);
      }

      if (delayedDigests) {
        continue;
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
          },
        }
      );
    }

    return steps;
  }

  private async getDigest(command: DigestFilterStepsCommand, step: NotificationStepEntity) {
    const where: any = {
      status: JobStatusEnum.DELAYED,
      type: StepTypeEnum.DIGEST,
      _subscriberId: command.subscriberId,
      _templateId: command.templateId,
      _environmentId: command.environmentId,
    };

    if (step.metadata.digestKey) {
      where['payload.' + step.metadata.digestKey] = command.payload[step.metadata.digestKey];
    }

    return await this.jobRepository.findOne(where);
  }
}
