import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ToolProviderIdEnum } from '@novu/shared';
import { Type } from 'class-transformer';
import { IsObject, IsOptional, ValidateNested } from 'class-validator';
import { ControlsMetadataDto } from '../../controls-metadata.dto';
import { PROVIDER_OVERRIDES_API_PROPERTY } from '../provider-overrides.dto';
import { StepResponseDto } from '../step.response.dto';
import { ToolControlDto } from '../tool-control.dto';

class ToolControlsMetadataResponseDto extends ControlsMetadataDto {
  @ApiProperty({
    description: 'Control values specific to Tool',
    type: () => ToolControlDto,
  })
  @ValidateNested()
  @Type(() => ToolControlDto)
  declare values: ToolControlDto;
}

export class ToolStepResponseDto extends StepResponseDto<ToolControlDto> {
  @ApiProperty({
    description: 'Controls metadata for the tool step',
    type: () => ToolControlsMetadataResponseDto,
  })
  @ValidateNested()
  @Type(() => ToolControlsMetadataResponseDto)
  declare controls: ToolControlsMetadataResponseDto;

  @ApiPropertyOptional({
    description: 'Control values for the tool step',
    type: () => ToolControlDto,
  })
  @ValidateNested()
  @Type(() => ToolControlDto)
  declare controlValues?: ToolControlDto;

  @ApiPropertyOptional({
    ...PROVIDER_OVERRIDES_API_PROPERTY,
  })
  @IsOptional()
  @IsObject()
  declare providerOverrides?: Partial<Record<ToolProviderIdEnum, Record<string, unknown>>> | null;
}
