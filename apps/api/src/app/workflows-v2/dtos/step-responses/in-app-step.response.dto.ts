import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ValidateNested } from 'class-validator';
import { InAppControlDto } from '../controls/in-app-control.dto';
import { ControlsMetadataDto } from '../controls-metadata.dto';
import { StepResponseDto } from '../step.response.dto';

class InAppControlsMetadataResponseDto extends ControlsMetadataDto {
  @ApiProperty({
    description: 'Control values specific to In-App',
    type: () => InAppControlDto,
  })
  @ValidateNested()
  @Type(() => InAppControlDto)
  declare values: InAppControlDto;
}

export class InAppStepResponseDto extends StepResponseDto<InAppControlDto> {
  @ApiProperty({
    description: 'Controls metadata for the in-app step',
    type: () => InAppControlsMetadataResponseDto,
  })
  @ValidateNested()
  @Type(() => InAppControlsMetadataResponseDto)
  declare controls: InAppControlsMetadataResponseDto;

  @ApiPropertyOptional({
    description: 'Control values for the in-app step',
    type: () => InAppControlDto,
  })
  @ValidateNested()
  @Type(() => InAppControlDto)
  declare controlValues?: InAppControlDto;
}
