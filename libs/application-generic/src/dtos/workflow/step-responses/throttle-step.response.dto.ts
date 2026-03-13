import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ValidateNested } from 'class-validator';
import { ControlsMetadataDto } from '../../controls-metadata.dto';
import { ThrottleControlDto } from '../controls/throttle-control.dto';
import { StepResponseDto } from '../step.response.dto';

class ThrottleControlsMetadataResponseDto extends ControlsMetadataDto {
  @ApiProperty({
    description: 'Control values specific to Throttle',
    type: () => ThrottleControlDto,
  })
  @ValidateNested()
  @Type(() => ThrottleControlDto)
  declare values: ThrottleControlDto;
}

export class ThrottleStepResponseDto extends StepResponseDto<ThrottleControlDto> {
  @ApiProperty({
    description: 'Controls metadata for the throttle step',
    type: () => ThrottleControlsMetadataResponseDto,
  })
  @ValidateNested()
  @Type(() => ThrottleControlsMetadataResponseDto)
  declare controls: ThrottleControlsMetadataResponseDto;

  @ApiPropertyOptional({
    description: 'Control values for the throttle step',
    type: () => ThrottleControlDto,
  })
  @ValidateNested()
  @Type(() => ThrottleControlDto)
  declare controlValues?: ThrottleControlDto;
}
