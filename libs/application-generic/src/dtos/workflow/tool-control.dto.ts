import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
import { SkipControlDto } from './skip.dto';

export class ToolControlDto extends SkipControlDto {
  @ApiPropertyOptional({ description: 'Content of the tool payload.' })
  @IsString()
  @IsOptional()
  body: string;
}
