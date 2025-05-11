import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class UpdateTopicRequestDto {
  @ApiProperty({
    description: 'The display name for the topic',
    example: 'Updated Topic Name',
  })
  @IsString()
  @IsNotEmpty()
  name: string;
}
