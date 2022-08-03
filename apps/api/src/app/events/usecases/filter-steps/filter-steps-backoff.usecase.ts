import { Injectable } from '@nestjs/common';
import { JobStatusEnum, JobRepository, NotificationStepEntity } from '@novu/dal';
import { StepTypeEnum } from '@novu/shared';
import { FilterStepsCommand } from './filter-steps.command';
import * as moment from 'moment';
import { FilterSteps } from './filter-steps.usecase';

@Injectable()
export class FilterStepsBackoff {
  constructor(private jobRepository: JobRepository) {}

  public async execute(command: FilterStepsCommand): Promise<NotificationStepEntity[]> {
    const steps = [FilterSteps.createTriggerStep(command)];
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

  private getTrigger(command: FilterStepsCommand, step: NotificationStepEntity) {
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

  private async alreadyHaveDigest(command: FilterStepsCommand, step: NotificationStepEntity): Promise<boolean> {
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
