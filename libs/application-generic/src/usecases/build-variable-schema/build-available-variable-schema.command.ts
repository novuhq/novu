import { ControlValuesEntity } from '@novu/dal';
import { StepTypeEnum } from '@novu/shared';
import { IsOptional, IsString } from 'class-validator';
import { EnvironmentWithUserCommand } from '../../commands';
import { JSONSchemaDto } from '../../dtos/json-schema.dto';
import { PreviewPayloadDto } from '../../dtos/workflow/preview-payload.dto';
import { WorkflowForVariableSchema } from '../../types/workflow-mapper.types';

// Type for optimistic step data used during sync
export interface IOptimisticStepInfo {
  stepId: string;
  type: StepTypeEnum;
  /**
   * In-flight control values from the upsert/sync payload.
   * Needed so HTTP response schemas are available before control values are persisted.
   */
  controlValues?: Record<string, unknown>;
  /**
   * Persisted step template id in the target environment (when updating an existing workflow).
   */
  _id?: string;
}

export class BuildVariableSchemaCommand extends EnvironmentWithUserCommand {
  @IsOptional()
  workflow?: WorkflowForVariableSchema;

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
