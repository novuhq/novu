import { Injectable } from '@nestjs/common';
import { JobEntity, JobStatusEnum, JobRepository, NotificationStepEntity } from '@novu/dal';
import { ChannelTypeEnum, DigestTypeEnum } from '@novu/shared';
import { FilterStepsCommand } from './filter-steps.command';
import * as moment from 'moment';
import { matchMessageWithFilters } from '../trigger-event/message-filter.matcher';

@Injectable()
export class FilterSteps {
  constructor(private jobRepository: JobRepository) {}

  public async execute(command: FilterStepsCommand): Promise<NotificationStepEntity[]> {
    const matchedSteps = matchMessageWithFilters(
      command.steps.filter((step) => step.active === true),
      command.payload
    );

    const digestStep = matchedSteps.find((step) => step.template.type === ChannelTypeEnum.DIGEST);

    if (!digestStep) {
      return matchedSteps;
    }

    const type = digestStep.metadata.type;
    if (type === DigestTypeEnum.REGULAR) {
      return await this.filterStepsRegularDigest(matchedSteps, command);
    }

    return await this.filterStepsBackoffDigest(matchedSteps, command);
  }

  private createTriggerStep(command: FilterStepsCommand): NotificationStepEntity {
    return {
      template: {
        _environmentId: command.environmentId,
        _organizationId: command.organizationId,
        _creatorId: command.userId,
        type: ChannelTypeEnum.TRIGGER,
        content: '',
      },
      _templateId: command.templateId,
    };
  }

  private async filterStepsRegularDigest(
    matchedSteps: NotificationStepEntity[],
    command: FilterStepsCommand
  ): Promise<NotificationStepEntity[]> {
    const steps = [this.createTriggerStep(command)];
    let delayedDigests: JobEntity = null;
    for (const step of matchedSteps) {
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

      const where: any = {
        status: JobStatusEnum.DELAYED,
        _subscriberId: command.subscriberId,
        _templateId: command.templateId,
        _environmentId: command.environmentId,
      };

      if (step.metadata.digestKey) {
        where['payload.' + step.metadata.digestKey] = command.payload[step.metadata.digestKey];
      }

      delayedDigests = await this.jobRepository.findOne(where);

      if (!delayedDigests) {
        steps.push(step);
      }
    }

    return steps;
  }

  private async filterStepsBackoffDigest(
    matchedSteps: NotificationStepEntity[],
    command: FilterStepsCommand
  ): Promise<NotificationStepEntity[]> {
    const steps = [this.createTriggerStep(command)];
    for (const step of matchedSteps) {
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
