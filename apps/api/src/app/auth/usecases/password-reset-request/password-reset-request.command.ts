import { IsDefined, IsEmail, IsOptional } from 'class-validator';
import { BaseCommand } from '../../../shared/commands/base.command';
import { CustomDataType } from '@novu/shared';
export class PasswordResetRequestCommand extends BaseCommand {
  @IsEmail()
  @IsDefined()
  email: string;
  @IsOptional()
  config?: CustomDataType;
}
