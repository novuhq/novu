import { ApiProperty } from '@nestjs/swagger';
import { ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ControlsMetadataDto } from '../controls-metadata.dto';
import { InAppControlDto } from '../controls/in-app-control.dto';

export class InAppControlsMetadataResponseDto extends ControlsMetadataDto {
  @ApiProperty({
    description: 'Control values specific to In-App',
    type: () => InAppControlDto,
  })
  @ValidateNested()
  @Type(() => InAppControlDto)
  declare values: InAppControlDto;
}
