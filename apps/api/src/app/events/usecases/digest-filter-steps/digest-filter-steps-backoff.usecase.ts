import { Injectable } from '@nestjs/common';
import { JobStatusEnum, JobRepository, NotificationStepEntity } from '@novu/dal';
import { StepTypeEnum } from '@novu/shared';
import { DigestFilterStepsCommand } from './digest-filter-steps.command';
import * as moment from 'moment';
import { DigestFilterSteps } from './digest-filter-steps.usecase';

@Injectable()
export class DigestFilterStepsBackoff {
  constructor(private jobRepository: JobRepository) {}

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
    return moment().subtract(step.metadata.backoffAmount, step.metadata.backoffUnit).toDate();
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

    const digests = await this.jobRepository.find(query);

    return digests.length > 0;
  }
}
