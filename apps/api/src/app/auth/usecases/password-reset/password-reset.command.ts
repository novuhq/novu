import { IsDefined, IsString, IsUUID, MinLength } from 'class-validator';
import { CommandHelper } from '../../../shared/commands/command.helper';
import { ApplicationWithUserCommand } from '../../../shared/commands/project.command';

export class PasswordResetCommand {
  static create(data: PasswordResetCommand) {
    return CommandHelper.create<PasswordResetCommand>(PasswordResetCommand, data);
  }

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
