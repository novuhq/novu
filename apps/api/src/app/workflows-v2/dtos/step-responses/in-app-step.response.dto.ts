import { ApiProperty } from '@nestjs/swagger';
import { ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { StepResponseDto } from '../step.response.dto';
import { InAppControlsMetadataResponseDto } from './in-app-controls-metadata.response.dto';

export class InAppStepResponseDto extends StepResponseDto {
  @ApiProperty({
    description: 'Controls metadata for the in-app step',
    type: () => InAppControlsMetadataResponseDto,
  })
  @ValidateNested()
  @Type(() => InAppControlsMetadataResponseDto)
  declare controls: InAppControlsMetadataResponseDto;
}
