import { ApiProperty } from '@nestjs/swagger';
import { ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ControlsMetadataDto } from '../controls-metadata.dto';
import { CustomControlDto } from '../controls/custom-control.dto';

export class CustomControlsMetadataResponseDto extends ControlsMetadataDto {
  @ApiProperty({
    description: 'Control values specific to Custom step',
    type: () => CustomControlDto,
  })
  @ValidateNested()
  @Type(() => CustomControlDto)
  declare values: CustomControlDto;
}
