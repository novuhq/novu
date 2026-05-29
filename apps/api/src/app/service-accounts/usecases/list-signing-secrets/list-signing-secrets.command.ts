import { EnvironmentLevelWithUserCommand } from '@novu/application-generic';
import { SigningSecretTypeEnum } from '@novu/shared';
import { IsEnum, IsOptional } from 'class-validator';

export class ListSigningSecretsCommand extends EnvironmentLevelWithUserCommand {
  @IsEnum(SigningSecretTypeEnum)
  @IsOptional()
  type?: SigningSecretTypeEnum;
}
