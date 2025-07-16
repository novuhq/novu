import { EnvironmentWithUserObjectCommand } from '@novu/application-generic';
import { IsString, IsOptional, IsBoolean } from 'class-validator';

export class PublishEnvironmentCommand extends EnvironmentWithUserObjectCommand {
  @IsOptional()
  @IsString()
  sourceEnvironmentId?: string;

  @IsString()
  targetEnvironmentId: string;

  @IsOptional()
  @IsBoolean()
  dryRun?: boolean;
}
