import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsObject, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';

import { LayoutPreviewPayloadDto } from './layout-preview-payload.dto';

export class LayoutPreviewRequestDto {
  @ApiPropertyOptional({
    description: 'Optional control values for layout preview',
    type: 'object',
    additionalProperties: true,
  })
  @IsOptional()
  @IsObject()
  controlValues?: Record<string, unknown>;

  @ApiPropertyOptional({
    description: 'Optional payload for layout preview',
    type: () => LayoutPreviewPayloadDto,
  })
  @IsOptional()
  @Type(() => LayoutPreviewPayloadDto)
  previewPayload?: LayoutPreviewPayloadDto;
}
