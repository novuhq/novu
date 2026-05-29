import { EnvironmentLevelWithUserCommand } from '@novu/application-generic';
import { IsNotEmpty, IsString } from 'class-validator';

export class RevokeSigningSecretCommand extends EnvironmentLevelWithUserCommand {
  @IsString()
  @IsNotEmpty()
  signingSecretId: string;
}
