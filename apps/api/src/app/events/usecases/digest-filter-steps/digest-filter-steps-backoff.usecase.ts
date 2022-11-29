import { Injectable } from '@nestjs/common';
import { JobStatusEnum, JobRepository, NotificationStepEntity, NotificationRepository } from '@novu/dal';
import { StepTypeEnum } from '@novu/shared';
import { DigestFilterStepsCommand } from './digest-filter-steps.command';
import { sub } from 'date-fns';
import { DigestFilterSteps } from './digest-filter-steps.usecase';

@Injectable()
export class DigestFilterStepsBackoff {
  constructor(private jobRepository: JobRepository, private notificationRepository: NotificationRepository) {}

  public async execute(command: DigestFilterStepsCommand): Promise<NotificationStepEntity[]> {
    const steps = [DigestFilterSteps.createTriggerStep(command)];
    for (const step of command.steps) {
      if (step.template.type !== StepTypeEnum.DIGEST) {
        steps.push(step);
        continue;
      }
      const trigger = await this.getTrigger(command, step);
      if (!trigger) {
        continue;
      }

      const haveDigest = await this.alreadyHaveDigest(command, step);
      if (haveDigest) {
        return steps;
      }
      steps.push(step);
    }

    return steps;
  }

  private getBackoffDate(step: NotificationStepEntity) {
    return sub(new Date(), {
      [step.metadata.backoffUnit]: step.metadata.backoffAmount,
    });
  }

  private getTrigger(command: DigestFilterStepsCommand, step: NotificationStepEntity) {
    const query = {
      updatedAt: {
        $gte: this.getBackoffDate(step),
      },
      _templateId: command.templateId,
      status: JobStatusEnum.COMPLETED,
      type: StepTypeEnum.TRIGGER,
      _environmentId: command.environmentId,
      _subscriberId: command.subscriberId,
    };

    if (step.metadata.digestKey) {
      query['payload.' + step.metadata.digestKey] = command.payload[step.metadata.digestKey];
    }

    return this.jobRepository.findOne(query);
  }

  private async alreadyHaveDigest(command: DigestFilterStepsCommand, step: NotificationStepEntity): Promise<boolean> {
    const query = {
      updatedAt: {
        $gte: this.getBackoffDate(step),
      },
      _templateId: command.templateId,
      type: StepTypeEnum.DIGEST,
      _environmentId: command.environmentId,
      _subscriberId: command.subscriberId,
    };

    if (step.metadata.digestKey) {
      query['payload.' + step.metadata.digestKey] = command.payload[step.metadata.digestKey];
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
          },
        }
      );
    }

    return haveDigests;
  }
}
