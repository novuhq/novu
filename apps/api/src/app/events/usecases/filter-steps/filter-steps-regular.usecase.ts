import { Injectable } from '@nestjs/common';
import { JobEntity, JobStatusEnum, JobRepository, NotificationStepEntity } from '@novu/dal';
import { ChannelTypeEnum } from '@novu/shared';
import { FilterStepsCommand } from './filter-steps.command';
import { FilterSteps } from './filter-steps.usecase';

@Injectable()
export class FilterStepsRegular {
  constructor(private jobRepository: JobRepository) {}

  public async execute(command: FilterStepsCommand): Promise<NotificationStepEntity[]> {
    const steps = [FilterSteps.createTriggerStep(command)];
    let delayedDigests: JobEntity = null;
    for (const step of command.steps) {
      if (step.template.type !== ChannelTypeEnum.DIGEST) {
        if (delayedDigests && !delayedDigests.digest.updateMode) {
          continue;
        }

        if (delayedDigests && delayedDigests.digest.updateMode && delayedDigests.type !== ChannelTypeEnum.IN_APP) {
          continue;
        }

        steps.push(step);
        continue;
      }

      delayedDigests = await this.getDigest(command, step);

      if (!delayedDigests) {
        steps.push(step);
      }
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
}
