import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsOptional } from 'class-validator';
import { BaseSubscriberFieldsDto } from '../../shared/dtos/base-subscriber-fields.dto';
import { SubscriberChannelDto } from './create-subscriber-request.dto';

export class UpdateSubscriberRequestDto extends BaseSubscriberFieldsDto {
  @ApiProperty({
    description: 'An array of communication channels for the subscriber.',
    type: SubscriberChannelDto,
    isArray: true,
    required: false,
  })
  @IsOptional()
  @IsArray()
  channels?: SubscriberChannelDto[];
}
