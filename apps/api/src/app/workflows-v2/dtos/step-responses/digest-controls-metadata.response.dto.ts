import { ApiProperty } from '@nestjs/swagger';
import { ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ControlsMetadataDto } from '../controls-metadata.dto';
import { DigestControlDto } from '../controls/digest-control.dto';

export class DigestControlsMetadataResponseDto extends ControlsMetadataDto {
  @ApiProperty({
    description: 'Control values specific to Digest',
    type: () => DigestControlDto,
  })
  @ValidateNested()
  @Type(() => DigestControlDto)
  declare values: DigestControlDto;
}
