import { ApiProperty } from '@nestjs/swagger';
import { ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ControlsMetadataDto } from '../controls-metadata.dto';
import { SmsControlDto } from '../controls/sms-control.dto';

export class SmsControlsMetadataResponseDto extends ControlsMetadataDto {
  @ApiProperty({
    description: 'Control values specific to SMS',
    type: () => SmsControlDto,
  })
  @ValidateNested()
  @Type(() => SmsControlDto)
  declare values: SmsControlDto;
}
