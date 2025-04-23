import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class CreateUpdateTopicRequestDto {
  @ApiProperty({
    description: 'The unique key identifier for the topic',
    example: 'task:12345',
  })
  @IsString()
  @IsNotEmpty()
  key: string;

  @ApiProperty({
    description: 'The display name for the topic',
    example: 'Task Title',
  })
  @IsString()
  @IsNotEmpty()
  name: string;
}
