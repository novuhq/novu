import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { StepResponseDto } from '../step.response.dto';
import { DelayControlsMetadataResponseDto } from './delay-controls-metadata.response.dto';
import { DelayControlDto } from '../controls/delay-control.dto';

export class DelayStepResponseDto extends StepResponseDto<DelayControlDto> {
  @ApiProperty({
    description: 'Controls metadata for the delay step',
    type: () => DelayControlsMetadataResponseDto,
  })
  @ValidateNested()
  @Type(() => DelayControlsMetadataResponseDto)
  declare controls: DelayControlsMetadataResponseDto;

  @ApiPropertyOptional({
    description: 'Control values for the delay step',
    type: () => DelayControlDto,
  })
  @ValidateNested()
  @Type(() => DelayControlDto)
  declare controlValues?: DelayControlDto;
}
