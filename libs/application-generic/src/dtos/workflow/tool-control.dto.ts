import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsOptional, IsString } from 'class-validator';
import { SkipControlDto } from './skip.dto';

export class ToolControlDto extends SkipControlDto {
  @ApiPropertyOptional({ description: 'Content of the tool payload.' })
  @IsString()
  @IsOptional()
  body: string;

  @ApiPropertyOptional({
    description:
      'Optional integration identifiers to deliver to. Empty or omitted sends to all active Tool integrations.',
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  enabledIntegrations?: string[];
}
