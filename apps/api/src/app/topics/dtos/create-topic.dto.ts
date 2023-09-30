import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDefined, IsString } from 'class-validator';

import { TopicDto } from './topic.dto';

import { TopicKey, TopicName } from '../types';

export class CreateTopicResponseDto implements Pick<TopicDto, '_id' & 'key'> {}

export class CreateTopicRequestDto {
  @ApiProperty({
    description:
      'User defined custom key and provided by the user that will be an unique identifier for the Topic created.',
  })
  @IsString()
  @IsDefined()
  key: TopicKey;

  @ApiProperty({
    description: 'User defined custom name and provided by the user that will name the Topic created.',
  })
  @IsString()
  @IsDefined()
  name: TopicName;
}
