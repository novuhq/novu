import { Injectable } from '@nestjs/common';
import { JobStatusEnum, JobRepository, NotificationStepEntity } from '@novu/dal';
import { ChannelTypeEnum } from '@novu/shared';
import { FilterStepsCommand } from './filter-steps.command';
import * as moment from 'moment';
import { FilterSteps } from './filter-steps.usecase';

@Injectable()
export class FilterStepsBackoff {
  constructor(private jobRepository: JobRepository) {}

  public async execute(command: FilterStepsCommand): Promise<NotificationStepEntity[]> {
    const steps = [FilterSteps.createTriggerStep(command)];
    for (const step of command.steps) {
      if (step.template.type === ChannelTypeEnum.DIGEST) {
        const from = moment().subtract(step.metadata.backoffAmount, step.metadata.backoffUnit).toDate();
        const query = {
          updatedAt: {
            $gte: from,
          },
          _templateId: command.templateId,
          status: JobStatusEnum.COMPLETED,
          type: ChannelTypeEnum.TRIGGER,
          _environmentId: command.environmentId,
          _subscriberId: command.subscriberId,
        };

        if (step.metadata.digestKey) {
          query['payload.' + step.metadata.digestKey] = command.payload[step.metadata.digestKey];
        }

        const trigger = await this.jobRepository.findOne(query);
        if (!trigger) {
          continue;
        }

        let digests = await this.jobRepository.find({
          updatedAt: {
            $gte: from,
          },
          _templateId: command.templateId,
          type: ChannelTypeEnum.DIGEST,
          _environmentId: command.environmentId,
          _subscriberId: command.subscriberId,
        });

        if (digests.length > 0 && step.metadata.digestKey) {
          digests = digests.filter((digest) => {
            return command.payload[step.metadata.digestKey] === digest.payload[step.metadata.digestKey];
          });
        }

        if (digests.length > 0) {
          return steps;
        }
        steps.push(step);
        continue;
      }
      steps.push(step);
    }

    return steps;
  }
}
