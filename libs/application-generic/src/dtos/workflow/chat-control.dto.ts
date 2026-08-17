import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, ValidateIf } from 'class-validator';
import { SkipControlDto } from './skip.dto';

export class ChatControlDto extends SkipControlDto {
  @ApiPropertyOptional({ description: 'Content of the chat message.' })
  @IsString()
  @IsOptional()
  body: string;

  @ApiPropertyOptional({
    description:
      'Type of editor to use for the body. When omitted, inferred from the body: Maily JSON is "block", otherwise "text".',
    enum: ['block', 'text'],
  })
  @ValidateIf((_, value) => value !== undefined && value !== null && value !== '')
  @IsIn(['block', 'text'])
  @IsString()
  @IsOptional()
  editorType?: 'block' | 'text';
}
