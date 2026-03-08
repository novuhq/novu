import { ControlValuesEntity, NotificationTemplateEntity } from '@novu/dal';
import { StepTypeEnum } from '@novu/shared';
import { IsOptional, IsString } from 'class-validator';
import { EnvironmentWithUserCommand } from '../../commands';
import { JSONSchemaDto } from '../../dtos/json-schema.dto';
import { PreviewPayloadDto } from '../../dtos/workflow/preview-payload.dto';

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

  @IsOptional()
  previewData?: PreviewPayloadDto;

  /**
   * Pre-loaded control values to avoid redundant database queries
   */
  @IsOptional()
  preloadedControlValues?: ControlValuesEntity[];

  /**
   * When set, takes precedence over workflow.payloadSchema for validation.
   * Needed when the payload schema is being updated in the same upsert operation.
   */
  @IsOptional()
  optimisticPayloadSchema?: JSONSchemaDto;
}
