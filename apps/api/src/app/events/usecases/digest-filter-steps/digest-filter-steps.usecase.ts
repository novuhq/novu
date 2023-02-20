import { Injectable, Logger } from '@nestjs/common';
import { MessageTemplateEntity, NotificationStepEntity } from '@novu/dal';
import { StepTypeEnum, DigestTypeEnum } from '@novu/shared';
import { DigestFilterStepsCommand } from './digest-filter-steps.command';
import { DigestFilterStepsBackoff } from './digest-filter-steps-backoff.usecase';
import { DigestFilterStepsRegular } from './digest-filter-steps-regular.usecase';

import { EventsPerformanceService } from '../../services/performance-service';

@Injectable()
export class DigestFilterSteps {
  constructor(
    private filterStepsBackoff: DigestFilterStepsBackoff,
    private filterStepsRegular: DigestFilterStepsRegular,
    protected performanceService: EventsPerformanceService
  ) {}

  public async execute(command: DigestFilterStepsCommand): Promise<NotificationStepEntity[]> {
    const mark = this.performanceService.buildDigestFilterStepsMark(
      command.transactionId,
      command.templateId,
      command.notificationId,
      command.subscriberId
    );

    const matchedSteps = command.steps.filter((step) => step.active === true);
    const digestStep = matchedSteps.find((step) => step.template?.type === StepTypeEnum.DIGEST);

    if (!digestStep) {
      return matchedSteps;
    }

    const type = digestStep?.metadata?.type;

    const actions = {
      [DigestTypeEnum.BACKOFF]: this.filterStepsBackoff,
      [DigestTypeEnum.REGULAR]: this.filterStepsRegular,
    };

    const action = type ? actions[type] : undefined;
    if (!action) {
      return [];
    }

    const steps = await action.execute({
      ...command,
      steps: matchedSteps,
    });

    this.performanceService.setEnd(mark);

    return steps;
  }

  public static createTriggerStep(command: DigestFilterStepsCommand): NotificationStepEntity {
    return {
      template: {
        _environmentId: command.environmentId,
        _organizationId: command.organizationId,
        _creatorId: command.userId,
        type: StepTypeEnum.TRIGGER,
        content: '',
      } as MessageTemplateEntity,
      _templateId: command.templateId,
    };
  }

  public static getNestedValue<ObjectType>(payload: ObjectType, path?: string) {
    if (!path || !payload) {
      return undefined;
    }

    try {
      let result;
      const keys = path.split('.');

      for (const key of keys) {
        result = payload[key];
      }

      return result;
    } catch (error) {
      Logger.error('Failure when parsing digest payload nested key');

      return undefined;
    }
  }
}
