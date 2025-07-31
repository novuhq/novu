import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsObject, IsOptional } from 'class-validator';

import { PreviewPayloadDto } from './preview-payload.dto';

export class GeneratePreviewRequestDto {
  @ApiPropertyOptional({
    description: 'Optional control values',
    type: 'object',
    additionalProperties: true,
  })
  @IsOptional()
  @IsObject()
  controlValues?: Record<string, unknown>;

  @ApiPropertyOptional({
    description: 'Optional payload for preview generation',
    type: () => PreviewPayloadDto,
  })
  @IsOptional()
  @Type(() => PreviewPayloadDto)
  previewPayload?: PreviewPayloadDto;
}
