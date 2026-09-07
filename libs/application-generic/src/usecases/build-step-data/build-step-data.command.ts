import { IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { EnvironmentWithUserObjectCommand } from '../../commands';
import { PreviewPayloadDto } from '../../dtos/workflow/preview-payload.dto';

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
