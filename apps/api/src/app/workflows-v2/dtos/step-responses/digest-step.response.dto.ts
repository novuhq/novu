import { ApiProperty } from '@nestjs/swagger';
import { ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { StepResponseDto } from '../step.response.dto';
import { DigestControlsMetadataResponseDto } from './digest-controls-metadata.response.dto';

export class DigestStepResponseDto extends StepResponseDto {
  @ApiProperty({
    description: 'Controls metadata for the digest step',
    type: () => DigestControlsMetadataResponseDto,
  })
  @ValidateNested()
  @Type(() => DigestControlsMetadataResponseDto)
  declare controls: DigestControlsMetadataResponseDto;
}
