import { ApiProperty } from '@nestjs/swagger';
import { IsDefined, IsString } from 'class-validator';

import { TopicDto } from './topic.dto';

import { TopicName } from '../types';

export class RenameTopicResponseDto extends TopicDto {}

export class RenameTopicRequestDto {
  @ApiProperty({
    description: 'User defined custom name and provided by the user to rename the topic.',
  })
  @IsString()
  @IsDefined()
  name: TopicName;
}
