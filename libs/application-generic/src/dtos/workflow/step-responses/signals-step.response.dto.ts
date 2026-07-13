import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ValidateNested } from 'class-validator';
import { ControlsMetadataDto } from '../../controls-metadata.dto';
import { SignalsControlDto } from '../signals-control.dto';
import { StepResponseDto } from '../step.response.dto';

class SignalsControlsMetadataResponseDto extends ControlsMetadataDto {
  @ApiProperty({
    description: 'Control values specific to Signals',
    type: () => SignalsControlDto,
  })
  @ValidateNested()
  @Type(() => SignalsControlDto)
  declare values: SignalsControlDto;
}

export class SignalsStepResponseDto extends StepResponseDto<SignalsControlDto> {
  @ApiProperty({
    description: 'Controls metadata for the signals step',
    type: () => SignalsControlsMetadataResponseDto,
  })
  @ValidateNested()
  @Type(() => SignalsControlsMetadataResponseDto)
  declare controls: SignalsControlsMetadataResponseDto;

  @ApiPropertyOptional({
    description: 'Control values for the signals step',
    type: () => SignalsControlDto,
  })
  @ValidateNested()
  @Type(() => SignalsControlDto)
  declare controlValues?: SignalsControlDto;
}
