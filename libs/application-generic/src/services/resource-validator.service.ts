import { Injectable } from '@nestjs/common';
import { NotificationStep } from '../usecases';
import { ApiException } from '../utils/exceptions';

@Injectable()
export class ResourceValidatorService {
  private readonly MAX_STEPS_PER_WORKFLOW = 10;

  validateStepsCount(steps: NotificationStep[]) {
    if (steps.length > this.MAX_STEPS_PER_WORKFLOW) {
      throw new ApiException({
        message: `Workflow steps limit exceeded. Maximum allowed steps is ${this.MAX_STEPS_PER_WORKFLOW}, but got ${steps.length} steps.`,
        providedStepsCount: steps.length,
        maxSteps: this.MAX_STEPS_PER_WORKFLOW,
      });
    }
  }
}
