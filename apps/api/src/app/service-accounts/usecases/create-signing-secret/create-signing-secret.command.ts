import { EnvironmentLevelWithUserCommand } from '@novu/application-generic';
import { SigningSecretTypeEnum } from '@novu/shared';
import { IsEnum } from 'class-validator';

export class CreateSigningSecretCommand extends EnvironmentLevelWithUserCommand {
  @IsEnum(SigningSecretTypeEnum)
  type: SigningSecretTypeEnum;
}
