import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { StepTypeEnum } from '@novu/shared';
import { IsEnum, IsObject, IsOptional, IsUrl } from 'class-validator';

/**
 * Request DTOs for the stateless bridge endpoints backing the dashboard's
 * "Local" environment mode. The bridge URL (a dev tunnel) lives only in the
 * caller's browser, so every request carries it explicitly.
 */
export class StatelessBridgeRequestDto {
  @ApiProperty({ description: 'URL of the bridge to call, typically a local dev tunnel' })
  @IsUrl({
    require_protocol: true,
    require_tld: false,
    protocols: ['http', 'https'],
  })
  bridgeUrl: string;
}

export class StatelessPreviewRequestDto extends StatelessBridgeRequestDto {
  @ApiProperty({
    description: 'Type of the step to preview; the workflow is not persisted, so the caller supplies it',
    enum: [...Object.values(StepTypeEnum)],
    enumName: 'StepTypeEnum',
  })
  @IsEnum(StepTypeEnum)
  stepType: StepTypeEnum;

  @ApiPropertyOptional({ description: 'Control values to preview with', type: 'object', additionalProperties: true })
  @IsOptional()
  @IsObject()
  controlValues?: Record<string, unknown>;

  @ApiPropertyOptional({
    description: 'Preview payload (payload, subscriber, actor, context) to preview with',
    type: 'object',
    additionalProperties: true,
  })
  @IsOptional()
  @IsObject()
  previewPayload?: Record<string, unknown>;
}
