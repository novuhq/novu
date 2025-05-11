import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, Length } from 'class-validator';

export class CreateUpdateTopicRequestDto {
  @ApiProperty({
    description:
      // eslint-disable-next-line max-len
      'The unique key identifier for the topic. The key must contain only alphanumeric characters (a-z, A-Z, 0-9), hyphens (-), underscores (_), colons (:), or be a valid email address.',
    example: 'task:12345',
  })
  @IsString()
  @IsNotEmpty()
  @Length(1, 100)
  key: string;

  @ApiProperty({
    description: 'The display name for the topic',
    example: 'Task Title',
  })
  @IsString()
  @IsNotEmpty()
  @Length(0, 100)
  name: string;
}
