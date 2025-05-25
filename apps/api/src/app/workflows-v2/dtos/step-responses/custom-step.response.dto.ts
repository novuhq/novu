import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { StepResponseDto } from '../step.response.dto';
import { CustomControlsMetadataResponseDto } from './custom-controls-metadata.response.dto';
import { CustomControlDto } from '../controls/custom-control.dto';

export class CustomStepResponseDto extends StepResponseDto<CustomControlDto> {
  @ApiProperty({
    description: 'Controls metadata for the custom step',
    type: () => CustomControlsMetadataResponseDto,
  })
  @ValidateNested()
  @Type(() => CustomControlsMetadataResponseDto)
  declare controls: CustomControlsMetadataResponseDto;

  @ApiPropertyOptional({
    description: 'Control values for the custom step',
    type: () => CustomControlDto,
  })
  @ValidateNested()
  @Type(() => CustomControlDto)
  declare controlValues?: CustomControlDto;
}
