import { EnvironmentWithUserObjectCommand } from '@novu/application-generic';
import { IsNotEmpty, IsString } from 'class-validator';

export class ClaimKeylessEnvironmentCommand extends EnvironmentWithUserObjectCommand {
  @IsString()
  @IsNotEmpty()
  readonly token: string;
}
