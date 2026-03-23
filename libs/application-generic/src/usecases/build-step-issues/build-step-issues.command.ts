import { ControlValuesEntity, NotificationTemplateEntity } from '@novu/dal';
import { ResourceOriginEnum, StepTypeEnum } from '@novu/shared';
import { IsDefined, IsEnum, IsObject, IsOptional, IsString } from 'class-validator';
import { EnvironmentWithUserObjectCommand } from '../../commands';
import { JSONSchemaDto } from '../../dtos/json-schema.dto';
import { IOptimisticStepInfo } from '../build-variable-schema/build-available-variable-schema.command';

export class BuildStepIssuesCommand extends EnvironmentWithUserObjectCommand {
  /**
   * Workflow origin is needed separately to handle origin-specific logic
   * before workflow creation
   */
  @IsDefined()
  @IsEnum(ResourceOriginEnum)
  workflowOrigin: ResourceOriginEnum;

  @IsOptional()
  workflow?: NotificationTemplateEntity;

  @IsString()
  @IsOptional()
  stepInternalId?: string;

  @IsObject()
  @IsOptional()
  controlsDto?: Record<string, unknown> | null;

  @IsDefined()
  @IsEnum(StepTypeEnum)
  stepType: StepTypeEnum;

  @IsObject()
  @IsDefined()
  controlSchema: JSONSchemaDto;

  /**
   * Optimistic step information for sync scenarios where steps aren't persisted yet
   * but need to be considered for variable schema building
   */
  @IsOptional()
  optimisticSteps?: IOptimisticStepInfo[];

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
