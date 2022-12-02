import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDefined, IsString } from 'class-validator';
import { TopicDto } from './topic.dto';

export class CreateTopicResponseDto implements Pick<TopicDto, '_id'> {}

export class CreateTopicRequestDto {
  @ApiProperty({
    description:
      'User defined custom key and provided by the user that will be an unique identifier for the Topic created.',
  })
  @IsString()
  @IsDefined()
  key: string;

  @ApiProperty({
    description: 'User defined custom name and provided by the user that will name the Topic created.',
  })
  @IsString()
  @IsDefined()
  name: string;
}
