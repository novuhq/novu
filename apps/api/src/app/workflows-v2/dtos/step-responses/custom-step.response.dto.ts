import { ApiProperty } from '@nestjs/swagger';
import { ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { StepResponseDto } from '../step.response.dto';
import { CustomControlsMetadataResponseDto } from './custom-controls-metadata.response.dto';

export class CustomStepResponseDto extends StepResponseDto {
  @ApiProperty({
    description: 'Controls metadata for the custom step',
    type: () => CustomControlsMetadataResponseDto,
  })
  @ValidateNested()
  @Type(() => CustomControlsMetadataResponseDto)
  declare controls: CustomControlsMetadataResponseDto;
}
