import { ControlValuesEntity, NotificationTemplateEntity } from '@novu/dal';
import { ResourceOriginEnum, type StepIntegrationOverrides, StepTypeEnum, ToolProviderIdEnum } from '@novu/shared';
import { IsDefined, IsEnum, IsObject, IsOptional, IsString } from 'class-validator';
import { EnvironmentWithUserObjectCommand } from '../../commands';
import { JSONSchemaDto } from '../../dtos/json-schema.dto';
import {
  IOptimisticStepInfo,
  IPreloadedEnvironmentContext,
} from '../build-variable-schema/build-available-variable-schema.command';

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

  @IsObject()
  @IsOptional()
  providerOverridesDto?: Partial<Record<ToolProviderIdEnum, Record<string, unknown>>> | null;

  @IsObject()
  @IsOptional()
  integrationOverridesDto?: StepIntegrationOverrides | null;

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
   * Pre-loaded control values to avoid redundant database queries.
   * When set, provider-control docs in this list are authoritative: an empty
   * provider set means the step has no provider overrides.
   */
  @IsOptional()
  preloadedControlValues?: ControlValuesEntity[];

  /**
   * Environment name/type and variables loaded once for a multi-step build.
   */
  @IsOptional()
  preloadedEnvironmentContext?: IPreloadedEnvironmentContext;

  /**
   * When set, takes precedence over workflow.payloadSchema for validation.
   * Needed when the payload schema is being updated in the same upsert operation.
   */
  @IsOptional()
  optimisticPayloadSchema?: JSONSchemaDto;
}
