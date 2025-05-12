import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, MinLength } from 'class-validator';
import { SkipControlDto } from './skip.dto';

export class ChatControlDto extends SkipControlDto {
  @ApiProperty({ description: 'Content of the chat message.' })
  @IsString()
  body: string;
}
