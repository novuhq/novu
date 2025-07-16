import { EnvironmentWithUserObjectCommand } from '@novu/application-generic';
import { IsString, IsOptional } from 'class-validator';

export class DiffEnvironmentCommand extends EnvironmentWithUserObjectCommand {
  @IsOptional()
  @IsString()
  sourceEnvironmentId?: string;

  @IsString()
  targetEnvironmentId: string;
}
