import { IsDefined, IsString, IsUUID } from 'class-validator';
import { CommandHelper } from '../../../shared/commands/command.helper';
import { ApplicationWithUserCommand } from '../../../shared/commands/project.command';

export class TriggerEventCommand extends ApplicationWithUserCommand {
  static create(data: TriggerEventCommand) {
    return CommandHelper.create(TriggerEventCommand, data);
  }

  @IsDefined()
  @IsString()
  identifier: string;

  @IsDefined()
  payload: any;

  @IsUUID()
  @IsDefined()
  transactionId: string;
}
