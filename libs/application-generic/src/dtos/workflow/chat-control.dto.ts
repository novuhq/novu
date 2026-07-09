import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { SkipControlDto } from './skip.dto';

export class ChatControlDto extends SkipControlDto {
  @ApiPropertyOptional({ description: 'Content of the chat message.' })
  @IsString()
  @IsOptional()
  body: string;

  @ApiPropertyOptional({
    description: 'Editor used for the body: block (Agent Card doc JSON) or text (plain string).',
    enum: ['block', 'text'],
  })
  @IsEnum(['block', 'text'])
  @IsOptional()
  editorType?: 'block' | 'text';
}
