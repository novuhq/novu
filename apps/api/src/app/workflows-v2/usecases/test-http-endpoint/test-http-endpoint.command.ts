import { EnvironmentWithUserObjectCommand } from '@novu/application-generic';
import { IsObject, IsOptional } from 'class-validator';
import { PreviewPayloadDto } from '../../dtos/preview-payload.dto';

export class TestHttpEndpointCommand extends EnvironmentWithUserObjectCommand {
  @IsOptional()
  @IsObject()
  controlValues?: Record<string, unknown>;

  @IsOptional()
  previewPayload?: PreviewPayloadDto;
}
