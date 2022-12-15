import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsDefined } from 'class-validator';

import { SubscriberId } from '../types';

export class RemoveSubscribersRequestDto {
  @ApiProperty({
    description: 'List of subscriber identifiers that will be removed to the topic',
  })
  @IsArray()
  @IsDefined()
  subscribers: SubscriberId[];
}
