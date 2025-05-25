import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { StepResponseDto } from '../step.response.dto';
import { InAppControlsMetadataResponseDto } from './in-app-controls-metadata.response.dto';
import { InAppControlDto } from '../controls/in-app-control.dto';

export class InAppStepResponseDto extends StepResponseDto<InAppControlDto> {
  @ApiProperty({
    description: 'Controls metadata for the in-app step',
    type: () => InAppControlsMetadataResponseDto,
  })
  @ValidateNested()
  @Type(() => InAppControlsMetadataResponseDto)
  declare controls: InAppControlsMetadataResponseDto;

  @ApiPropertyOptional({
    description: 'Control values for the in-app step',
    type: () => InAppControlDto,
  })
  @ValidateNested()
  @Type(() => InAppControlDto)
  declare controlValues?: InAppControlDto;
}
