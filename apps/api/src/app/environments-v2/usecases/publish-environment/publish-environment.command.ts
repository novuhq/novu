import { EnvironmentWithUserObjectCommand } from '@novu/application-generic';
import { IsString, IsOptional, IsBoolean, IsNumber, Min, Max } from 'class-validator';

export class PublishEnvironmentCommand extends EnvironmentWithUserObjectCommand {
  @IsString()
  sourceEnvironmentId: string;

  @IsString()
  targetEnvironmentId: string;

  @IsOptional()
  @IsBoolean()
  dryRun?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(500)
  batchSize?: number;
}
