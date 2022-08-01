import { IsDefined, IsString } from 'class-validator';
import { CommandHelper } from '../../../shared/commands/command.helper';
import { EnvironmentWithUserCommand } from '../../../shared/commands/project.command';

export class CancelDigestCommand extends EnvironmentWithUserCommand {
  static create(data: CancelDigestCommand) {
    return CommandHelper.create(CancelDigestCommand, data);
  }

  @IsString()
  @IsDefined()
  transactionId: string;
}
