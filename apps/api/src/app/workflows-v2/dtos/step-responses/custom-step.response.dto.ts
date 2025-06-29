import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { StepResponseDto } from '../step.response.dto';
import { ControlsMetadataDto } from '../controls-metadata.dto';
import { CustomControlDto } from '../controls/custom-control.dto';

class CustomControlsMetadataResponseDto extends ControlsMetadataDto {
  @ApiProperty({
    description: 'Control values specific to Custom step',
    type: () => CustomControlDto,
  })
  @ValidateNested()
  @Type(() => CustomControlDto)
  declare values: CustomControlDto;
}

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
