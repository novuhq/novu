import { ApiProperty } from '@nestjs/swagger';
import { ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ControlsMetadataDto } from '../controls-metadata.dto';
import { PushControlDto } from '../controls/push-control.dto';

export class PushControlsMetadataResponseDto extends ControlsMetadataDto {
  @ApiProperty({
    description: 'Control values specific to Push',
    type: () => PushControlDto,
  })
  @ValidateNested()
  @Type(() => PushControlDto)
  declare values: PushControlDto;
}
