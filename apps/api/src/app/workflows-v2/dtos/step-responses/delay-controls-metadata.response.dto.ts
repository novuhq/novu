import { ApiProperty } from '@nestjs/swagger';
import { ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ControlsMetadataDto } from '../controls-metadata.dto';
import { DelayControlDto } from '../controls/delay-control.dto';

export class DelayControlsMetadataResponseDto extends ControlsMetadataDto {
  @ApiProperty({
    description: 'Control values specific to Delay',
    type: () => DelayControlDto,
  })
  @ValidateNested()
  @Type(() => DelayControlDto)
  declare values: DelayControlDto;
}
