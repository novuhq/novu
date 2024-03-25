import { IsDefined, IsEmail, IsEnum, IsOptional } from 'class-validator';
import { PasswordResetFlowEnum } from '@novu/shared';
import { BaseCommand } from '../../../shared/commands/base.command';

export class PasswordResetRequestCommand extends BaseCommand {
  @IsEmail()
  @IsDefined()
  email: string;

  @IsEnum(PasswordResetFlowEnum)
  @IsOptional()
  src?: PasswordResetFlowEnum;
}
