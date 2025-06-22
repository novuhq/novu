import { EnvironmentWithUserObjectCommand } from '@novu/application-generic';
import { IsString, IsOptional, IsBoolean } from 'class-validator';

export class DiffEnvironmentCommand extends EnvironmentWithUserObjectCommand {
  @IsString()
  sourceEnvironmentId: string;

  @IsString()
  targetEnvironmentId: string;

  @IsOptional()
  @IsBoolean()
  includeInactive?: boolean;
}
