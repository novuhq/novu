import { EnvironmentWithUserObjectCommand } from '@novu/application-generic';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { PreviewPayloadDto } from '../../dtos';

export class BuildStepDataCommand extends EnvironmentWithUserObjectCommand {
  @IsString()
  @IsNotEmpty()
  workflowIdOrInternalId: string;

  @IsString()
  @IsNotEmpty()
  stepIdOrInternalId: string;

  @IsOptional()
  previewPayload?: PreviewPayloadDto;
}
