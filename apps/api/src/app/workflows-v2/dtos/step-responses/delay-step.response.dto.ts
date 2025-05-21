import { ApiProperty } from '@nestjs/swagger';
import { ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { StepResponseDto } from '../step.response.dto';
import { DelayControlsMetadataResponseDto } from './delay-controls-metadata.response.dto';

export class DelayStepResponseDto extends StepResponseDto {
  @ApiProperty({
    description: 'Controls metadata for the delay step',
    type: () => DelayControlsMetadataResponseDto,
  })
  @ValidateNested()
  @Type(() => DelayControlsMetadataResponseDto)
  declare controls: DelayControlsMetadataResponseDto;
}
