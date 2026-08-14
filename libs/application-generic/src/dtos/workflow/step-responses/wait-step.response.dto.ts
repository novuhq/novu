import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ValidateNested } from 'class-validator';
import { ControlsMetadataDto } from '../../controls-metadata.dto';
import { WaitControlDto } from '../controls/wait-control.dto';
import { StepResponseDto } from '../step.response.dto';

class WaitControlsMetadataResponseDto extends ControlsMetadataDto {
  @ApiProperty({
    description: 'Control values specific to Wait',
    type: () => WaitControlDto,
  })
  @ValidateNested()
  @Type(() => WaitControlDto)
  declare values: WaitControlDto;
}

export class WaitStepResponseDto extends StepResponseDto<WaitControlDto> {
  @ApiProperty({
    description: 'Controls metadata for the wait step',
    type: () => WaitControlsMetadataResponseDto,
  })
  @ValidateNested()
  @Type(() => WaitControlsMetadataResponseDto)
  declare controls: WaitControlsMetadataResponseDto;

  @ApiPropertyOptional({
    description: 'Control values for the wait step',
    type: () => WaitControlDto,
  })
  @ValidateNested()
  @Type(() => WaitControlDto)
  declare controlValues?: WaitControlDto;
}
