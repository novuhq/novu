import { Injectable } from '@nestjs/common';
import { JobEntity, JobStatusEnum, JobRepository, NotificationStepEntity } from '@novu/dal';
import { ChannelTypeEnum, StepTypeEnum } from '@novu/shared';
import { FilterStepsCommand } from './filter-steps.command';
import { FilterSteps } from './filter-steps.usecase';

@Injectable()
export class FilterStepsRegular {
  constructor(private jobRepository: JobRepository) {}

  public async execute(command: FilterStepsCommand): Promise<NotificationStepEntity[]> {
    const steps = [FilterSteps.createTriggerStep(command)];
    let delayedDigests: JobEntity = null;
    for (const step of command.steps) {
      if (step.template.type === StepTypeEnum.DIGEST) {
        delayedDigests = await this.getDigest(command, step);
      }

      if (this.shouldContinue(delayedDigests)) {
        continue;
      }

      steps.push(step);
    }

    return steps;
  }

  private async getDigest(command: FilterStepsCommand, step: NotificationStepEntity) {
    const where: any = {
      status: JobStatusEnum.DELAYED,
      _subscriberId: command.subscriberId,
      _templateId: command.templateId,
      _environmentId: command.environmentId,
    };

    if (step.metadata.digestKey) {
      where['payload.' + step.metadata.digestKey] = command.payload[step.metadata.digestKey];
    }

    return await this.jobRepository.findOne(where);
  }

  private shouldContinue(delayedDigests): boolean {
    if (!delayedDigests) {
      return false;
    }
    if (!delayedDigests.digest.updateMode) {
      return true;
    }
    if (delayedDigests.type !== ChannelTypeEnum.IN_APP) {
      return true;
    }

    return false;
  }
}
