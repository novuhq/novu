import { ApiProperty } from '@nestjs/swagger';
import { ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { StepResponseDto } from '../step.response.dto';
import { PushControlsMetadataResponseDto } from './push-controls-metadata.response.dto';

export class PushStepResponseDto extends StepResponseDto {
  @ApiProperty({
    description: 'Controls metadata for the push step',
    type: () => PushControlsMetadataResponseDto,
  })
  @ValidateNested()
  @Type(() => PushControlsMetadataResponseDto)
  declare controls: PushControlsMetadataResponseDto;
}
