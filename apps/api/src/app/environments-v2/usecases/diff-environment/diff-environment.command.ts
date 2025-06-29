import { EnvironmentWithUserObjectCommand } from '@novu/application-generic';
import { IsString } from 'class-validator';

export class DiffEnvironmentCommand extends EnvironmentWithUserObjectCommand {
  @IsString()
  sourceEnvironmentId: string;

  @IsString()
  targetEnvironmentId: string;
}
