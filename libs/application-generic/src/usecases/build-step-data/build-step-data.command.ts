import { ControlValuesEntity, NotificationTemplateEntity } from '@novu/dal';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { EnvironmentWithUserObjectCommand } from '../../commands';
import { PreviewPayloadDto } from '../../dtos/workflow/preview-payload.dto';
import type { StepOverrideDoc } from '../../utils/step-overrides';
import { IPreloadedEnvironmentContext } from '../build-variable-schema/build-available-variable-schema.command';

/**
 * Workflow, controls, and environment data loaded once for a multi-step read.
 * Pass via `BaseCommand.create` extras so class-transformer does not clone the maps.
 */
export interface WorkflowStepSharedContext {
  workflow: NotificationTemplateEntity;
  stepControlsByTemplateId: Map<string, Record<string, unknown>>;
  overrideDocsByTemplateId: Map<string, StepOverrideDoc[]>;
  stepControlValues: ControlValuesEntity[];
  environmentContext: IPreloadedEnvironmentContext;
}

export class BuildStepDataCommand extends EnvironmentWithUserObjectCommand {
  @IsString()
  @IsNotEmpty()
  workflowIdOrInternalId: string;

  @IsString()
  @IsNotEmpty()
  stepIdOrInternalId: string;

  @IsOptional()
  previewPayload?: PreviewPayloadDto;

  sharedContext?: WorkflowStepSharedContext;
}
