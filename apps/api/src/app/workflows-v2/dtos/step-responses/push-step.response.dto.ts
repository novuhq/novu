import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ValidateNested } from 'class-validator';
import { PushControlDto } from '../controls/push-control.dto';
import { ControlsMetadataDto } from '../controls-metadata.dto';
import { StepResponseDto } from '../step.response.dto';

class PushControlsMetadataResponseDto extends ControlsMetadataDto {
  @ApiProperty({
    description: 'Control values specific to Push',
    type: () => PushControlDto,
  })
  @ValidateNested()
  @Type(() => PushControlDto)
  declare values: PushControlDto;
}

export class PushStepResponseDto extends StepResponseDto<PushControlDto> {
  @ApiProperty({
    description: 'Controls metadata for the push step',
    type: () => PushControlsMetadataResponseDto,
  })
  @ValidateNested()
  @Type(() => PushControlsMetadataResponseDto)
  declare controls: PushControlsMetadataResponseDto;

  @ApiPropertyOptional({
    description: 'Control values for the push step',
    type: () => PushControlDto,
  })
  @ValidateNested()
  @Type(() => PushControlDto)
  declare controlValues?: PushControlDto;
}
