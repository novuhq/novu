import { ControlValuesEntity, NotificationTemplateEntity } from '@novu/dal';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { EnvironmentWithUserObjectCommand } from '../../commands';
import { PreviewPayloadDto } from '../../dtos/workflow/preview-payload.dto';
import { IPreloadedEnvironmentContext } from '../build-variable-schema/build-available-variable-schema.command';

/**
 * Workflow, controls, and environment data loaded once for a multi-step read.
 * Pass via `BaseCommand.create` extras so class-transformer does not clone the maps.
 */
export interface WorkflowStepSharedContext {
  workflow: NotificationTemplateEntity;
  stepControlsByTemplateId: Map<string, Record<string, unknown>>;
  providerDocsByTemplateId: Map<string, Array<Pick<ControlValuesEntity, 'providerId' | 'controls'>>>;
  integrationDocsByTemplateId: Map<
    string,
    Array<Pick<ControlValuesEntity, 'providerId' | 'integrationIdentifier' | 'controls'>>
  >;
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
