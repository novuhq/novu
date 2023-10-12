import { Injectable, Logger } from '@nestjs/common';
import { NotificationStepEntity } from '@novu/dal';
import { DigestTypeEnum, StepTypeEnum } from '@novu/shared';

import { DigestFilterStepsCommand } from './digest-filter-steps.command';
import { DigestFilterStepsRegular } from './digest-filter-steps-regular.usecase';
import { DigestFilterStepsTimed } from './digest-filter-steps-timed.usecase';

const LOG_CONTEXT = 'DigestFilterSteps';

// TODO; Potentially rename this use case
@Injectable()
export class DigestFilterSteps {
  constructor(
    private filterStepsRegular: DigestFilterStepsRegular,
    private filterStepsTimed: DigestFilterStepsTimed
  ) {}

  public async execute(
    command: DigestFilterStepsCommand
  ): Promise<NotificationStepEntity[]> {
    const action: DigestFilterStepsRegular | DigestFilterStepsTimed =
      command.type === DigestTypeEnum.TIMED
        ? this.filterStepsTimed
        : this.filterStepsRegular;

    const steps = await action.execute({
      ...command,
      steps: command.steps,
    });

    const triggerStep = this.createTriggerStep(command);

    return [triggerStep, ...steps];
  }

  private createTriggerStep(
    command: DigestFilterStepsCommand
  ): NotificationStepEntity {
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

  public static getNestedValue<ObjectType>(
    payload: ObjectType,
    path?: string
  ): ObjectType | undefined {
    if (!path || !payload) {
      return undefined;
    }

    try {
      let result = payload;
      const keys = path.split('.');

      for (const key of keys) {
        if (result === undefined) {
          return undefined;
        }
        result = result[key];
      }

      return result;
    } catch (error) {
      Logger.error(
        error,
        'Failure when parsing digest payload nested key',
        LOG_CONTEXT
      );

      return undefined;
    }
  }
}
