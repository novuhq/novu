import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ValidateNested } from 'class-validator';
import { DigestControlDto } from '../controls/digest-control.dto';
import { ControlsMetadataDto } from '../controls-metadata.dto';
import { StepResponseDto } from '../step.response.dto';

class DigestControlsMetadataResponseDto extends ControlsMetadataDto {
  @ApiProperty({
    description: 'Control values specific to Digest',
    type: () => DigestControlDto,
  })
  @ValidateNested()
  @Type(() => DigestControlDto)
  declare values: DigestControlDto;
}

export class DigestStepResponseDto extends StepResponseDto<DigestControlDto> {
  @ApiProperty({
    description: 'Controls metadata for the digest step',
    type: () => DigestControlsMetadataResponseDto,
  })
  @ValidateNested()
  @Type(() => DigestControlsMetadataResponseDto)
  declare controls: DigestControlsMetadataResponseDto;

  @ApiPropertyOptional({
    description: 'Control values for the digest step',
    type: () => DigestControlDto,
  })
  @ValidateNested()
  @Type(() => DigestControlDto)
  declare controlValues?: DigestControlDto;
}
