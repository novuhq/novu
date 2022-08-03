import { Injectable } from '@nestjs/common';
import { NotificationStepEntity } from '@novu/dal';
import { StepTypeEnum, DigestTypeEnum } from '@novu/shared';
import { FilterStepsCommand } from './filter-steps.command';
import { matchMessageWithFilters } from '../trigger-event/message-filter.matcher';
import { FilterStepsBackoff } from './filter-steps-backoff.usecase';
import { FilterStepsRegular } from './filter-steps-regular.usecase';

@Injectable()
export class FilterSteps {
  constructor(private filterStepsBackoff: FilterStepsBackoff, private filterStepsRegular: FilterStepsRegular) {}

  public async execute(command: FilterStepsCommand): Promise<NotificationStepEntity[]> {
    const matchedSteps = matchMessageWithFilters(
      command.steps.filter((step) => step.active === true),
      command.payload
    );

    const digestStep = matchedSteps.find((step) => step.template.type === StepTypeEnum.DIGEST);

    if (!digestStep) {
      return matchedSteps;
    }

    const type = digestStep.metadata.type;
    if (type === DigestTypeEnum.REGULAR) {
      return this.filterStepsRegular.execute({
        ...command,
        steps: matchedSteps,
      });
    }

    return this.filterStepsBackoff.execute({
      ...command,
      steps: matchedSteps,
    });
  }

  public static createTriggerStep(command: FilterStepsCommand): NotificationStepEntity {
    return {
      template: {
        _environmentId: command.environmentId,
        _organizationId: command.organizationId,
        _creatorId: command.userId,
        type: StepTypeEnum.TRIGGER,
        content: '',
      },
      _templateId: command.templateId,
    };
  }
}
