import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsOptional, IsString } from 'class-validator';

export class UpdateAllSubscriberNotificationsDto {
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @ApiPropertyOptional({
    description: 'Filter notifications by workflow tags',
    type: [String],
  })
  tags?: string[];

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({
    description: 'Filter notifications by data attributes (JSON string)',
  })
  data?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @ApiPropertyOptional({
    description: 'Context keys for filtering notifications',
    type: [String],
  })
  contextKeys?: string[];
}
