import { BaseCommand } from '@novu/application-generic';
import { PasswordResetFlowEnum } from '@novu/shared';
import { IsDefined, IsEmail, IsEnum, IsOptional } from 'class-validator';

export class PasswordResetRequestCommand extends BaseCommand {
  @IsEmail()
  @IsDefined()
  email: string;

  @IsEnum(PasswordResetFlowEnum)
  @IsOptional()
  src?: PasswordResetFlowEnum;
}
