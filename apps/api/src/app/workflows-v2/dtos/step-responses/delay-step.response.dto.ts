import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { StepResponseDto } from '../step.response.dto';
import { ControlsMetadataDto } from '../controls-metadata.dto';
import { DelayControlDto } from '../controls/delay-control.dto';

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
