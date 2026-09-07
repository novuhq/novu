import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsDefined, IsNotEmpty, IsString } from 'class-validator';
import { BaseSubscriberFieldsDto } from '../../shared/dtos/base-subscriber-fields.dto';

export class CreateSubscriberRequestDto extends BaseSubscriberFieldsDto {
  @ApiProperty({
    type: String,
    description: 'Unique identifier of the subscriber',
  })
  @IsString()
  @IsDefined()
  @IsNotEmpty({
    message: 'SubscriberId is required',
  })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  subscriberId: string;
}
