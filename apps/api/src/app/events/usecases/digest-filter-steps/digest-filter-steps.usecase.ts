import { Injectable } from '@nestjs/common';
import { NotificationStepEntity } from '@novu/dal';
import { StepTypeEnum, DigestTypeEnum } from '@novu/shared';
import { DigestFilterStepsCommand } from './digest-filter-steps.command';
import { DigestFilterStepsBackoff } from './digest-filter-steps-backoff.usecase';
import { DigestFilterStepsRegular } from './digest-filter-steps-regular.usecase';

@Injectable()
export class DigestFilterSteps {
  constructor(
    private filterStepsBackoff: DigestFilterStepsBackoff,
    private filterStepsRegular: DigestFilterStepsRegular
  ) {}

  public async execute(command: DigestFilterStepsCommand): Promise<NotificationStepEntity[]> {
    const matchedSteps = command.steps.filter((step) => step.active === true);
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

  public static createTriggerStep(command: DigestFilterStepsCommand): NotificationStepEntity {
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
