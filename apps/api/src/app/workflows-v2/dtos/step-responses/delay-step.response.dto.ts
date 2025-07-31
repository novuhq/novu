import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ValidateNested } from 'class-validator';
import { DelayControlDto } from '../controls/delay-control.dto';
import { ControlsMetadataDto } from '../controls-metadata.dto';
import { StepResponseDto } from '../step.response.dto';

class DelayControlsMetadataResponseDto extends ControlsMetadataDto {
  @ApiProperty({
    description: 'Control values specific to Delay',
    type: () => DelayControlDto,
  })
  @ValidateNested()
  @Type(() => DelayControlDto)
  declare values: DelayControlDto;
}

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
