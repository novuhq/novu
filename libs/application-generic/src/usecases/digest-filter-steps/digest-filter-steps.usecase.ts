import { Injectable } from '@nestjs/common';
import { NotificationStepEntity } from '@novu/dal';
import { StepTypeEnum } from '@novu/shared';

import { DigestFilterStepsCommand } from './digest-filter-steps.command';

type StepWithTemplate = NotificationStepEntity & { template: NonNullable<NotificationStepEntity['template']> };

// TODO; Potentially rename this use case
@Injectable()
export class DigestFilterSteps {
  public async execute<TStep extends NotificationStepEntity>(
    command: Omit<DigestFilterStepsCommand, 'steps'> & { steps: TStep[] }
  ): Promise<(TStep | StepWithTemplate)[]> {
    const { steps } = command;

    const triggerStep = this.createTriggerStep(command);

    return [triggerStep, ...steps];
  }

  private createTriggerStep(command: Omit<DigestFilterStepsCommand, 'steps'>): StepWithTemplate {
    return {
      template: {
        _environmentId: command.environmentId,
        _organizationId: command.organizationId,
        _creatorId: command.userId,
        _layoutId: null,
        type: StepTypeEnum.TRIGGER,
        content: '',
      },
      _templateId: command.templateId,
    };
  }
}
