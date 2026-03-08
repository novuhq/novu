import { EnvironmentWithUserObjectCommand, PreviewPayloadDto } from '@novu/application-generic';
import { IsObject, IsOptional } from 'class-validator';

export class TestHttpEndpointCommand extends EnvironmentWithUserObjectCommand {
  @IsOptional()
  @IsObject()
  controlValues?: Record<string, unknown>;

  @IsOptional()
  previewPayload?: PreviewPayloadDto;
}
