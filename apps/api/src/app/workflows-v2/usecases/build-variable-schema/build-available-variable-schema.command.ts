import { EnvironmentWithUserCommand } from '@novu/application-generic';
import { NotificationTemplateEntity } from '@novu/dal';
import { StepTypeEnum } from '@novu/shared';
import { IsDefined, IsOptional, IsString } from 'class-validator';

// Type for optimistic step data used during sync
export interface IOptimisticStepInfo {
  stepId: string;
  type: StepTypeEnum;
}

export class BuildVariableSchemaCommand extends EnvironmentWithUserCommand {
  @IsOptional()
  workflow?: NotificationTemplateEntity;

  @IsOptional()
  @IsString()
  stepInternalId?: string;

  /**
   * Is needed for generation of payload schema before control values are stored
   */
  @IsOptional()
  optimisticControlValues?: Record<string, unknown>;

  /**
   * Optimistic step information for sync scenarios where steps aren't persisted yet
   * but need to be considered for variable schema building
   */
  @IsOptional()
  optimisticSteps?: IOptimisticStepInfo[];
}
