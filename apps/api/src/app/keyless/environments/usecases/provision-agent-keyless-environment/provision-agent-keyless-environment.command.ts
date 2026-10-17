import { BaseCommand } from '@novu/application-generic';
import { IsOptional, IsString } from 'class-validator';

export class ProvisionAgentKeylessEnvironmentCommand extends BaseCommand {
  @IsOptional()
  @IsString()
  source?: string;

  @IsOptional()
  @IsString()
  clientIp?: string;

  @IsOptional()
  @IsString()
  userAgent?: string;
}
