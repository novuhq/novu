import { ApiPropertyOptional } from '@nestjs/swagger';
import { ToolProviderIdEnum } from '@novu/shared';
import { IsObject, IsOptional, IsString } from 'class-validator';
import { SkipControlDto } from './skip.dto';

export class ToolControlDto extends SkipControlDto {
  @ApiPropertyOptional({ description: 'Content of the tool payload.' })
  @IsString()
  @IsOptional()
  body: string;

  @ApiPropertyOptional({
    description:
      'Optional per-provider content overrides keyed by providerId. Merged over the default body at send time.',
    type: 'object',
    additionalProperties: {
      type: 'object',
      additionalProperties: true,
    },
    example: {
      [ToolProviderIdEnum.PagerDuty]: { severity: 'warning', source: 'novu' },
      [ToolProviderIdEnum.Opsgenie]: { priority: 'P2' },
    },
  })
  @IsObject()
  @IsOptional()
  providerOverrides?: Partial<Record<ToolProviderIdEnum, Record<string, unknown>>>;
}
