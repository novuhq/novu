import { ApiPropertyOptional } from '@nestjs/swagger';
import { IConfigurations } from '@novu/shared';
import { IsOptional, IsString } from 'class-validator';

export class ConfigurationsDto implements IConfigurations {
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  inboundWebhookEnabled?: boolean;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  inboundWebhookSigningKey?: string;
}
