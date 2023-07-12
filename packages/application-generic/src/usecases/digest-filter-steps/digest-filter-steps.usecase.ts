import { Injectable, Logger } from '@nestjs/common';
import { NotificationStepEntity } from '@novu/dal';
import { DigestTypeEnum, StepTypeEnum } from '@novu/shared';

import { DigestFilterStepsCommand } from './digest-filter-steps.command';
import { DigestFilterStepsBackoff } from './digest-filter-steps-backoff.usecase';
import { DigestFilterStepsRegular } from './digest-filter-steps-regular.usecase';
import { DigestFilterStepsTimed } from './digest-filter-steps-timed.usecase';
import { EventsPerformanceService } from '../../services/performance/events-performance.service';

// TODO; Potentially rename this use case
@Injectable()
export class DigestFilterSteps {
  constructor(
    private filterStepsBackoff: DigestFilterStepsBackoff,
    private filterStepsRegular: DigestFilterStepsRegular,
    private filterStepsTimed: DigestFilterStepsTimed,
    protected performanceService: EventsPerformanceService
  ) {}

  public async execute(
    command: DigestFilterStepsCommand
  ): Promise<NotificationStepEntity[]> {
    const mark = this.performanceService.buildDigestFilterStepsMark(
      command.transactionId,
      command.templateId,
      command.notificationId,
      command._subscriberId
    );

    const actions = {
      [DigestTypeEnum.BACKOFF]: this.filterStepsBackoff,
      [DigestTypeEnum.REGULAR]: this.filterStepsRegular,
      [DigestTypeEnum.TIMED]: this.filterStepsTimed,
    };

    let action = actions[command.type];

    if (command.backoff) {
      action = this.filterStepsBackoff;
    }

    const steps = await action.execute({
      ...command,
      steps: command.steps,
    });

    const triggerStep = this.createTriggerStep(command);

    this.performanceService.setEnd(mark);

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

  public static getNestedValue<ObjectType>(payload: ObjectType, path?: string) {
    if (!path || !payload) {
      return undefined;
    }

    try {
      let result = payload;
      const keys = path.split('.');

      for (const key of keys) {
        result = result[key];
      }

      return result;
    } catch (error) {
      Logger.error('Failure when parsing digest payload nested key');

      return undefined;
    }
  }
}
