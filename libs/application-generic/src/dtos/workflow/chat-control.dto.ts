import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
import { SkipControlDto } from './skip.dto';

export class ChatControlDto extends SkipControlDto {
  @ApiPropertyOptional({ description: 'Content of the chat message.' })
  @IsString()
  @IsOptional()
  body: string;
}
