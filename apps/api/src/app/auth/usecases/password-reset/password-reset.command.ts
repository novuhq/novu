import { IsDefined, IsString, IsUUID, MinLength } from 'class-validator';
import { BaseCommand } from '@novu/application-generic';

export class PasswordResetCommand extends BaseCommand {
  @IsString()
  @IsDefined()
  @MinLength(8)
  password: string;

  @IsUUID(4, {
    message: 'Bad token provided',
  })
  @IsDefined()
  token: string;
}
