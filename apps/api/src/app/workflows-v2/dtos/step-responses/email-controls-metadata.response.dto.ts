import { ApiProperty } from '@nestjs/swagger';
import { ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ControlsMetadataDto } from '../controls-metadata.dto';
import { EmailControlDto } from '../controls/email-control.dto';

export class EmailControlsMetadataResponseDto extends ControlsMetadataDto {
  @ApiProperty({
    description: 'Control values specific to Email',
    type: () => EmailControlDto,
  })
  @ValidateNested()
  @Type(() => EmailControlDto)
  declare values: EmailControlDto;
}
