import { IsDefined, IsString, IsUUID } from 'class-validator';
import { CommandHelper } from '../../../shared/commands/command.helper';
import { EnvironmentWithUserCommand } from '../../../shared/commands/project.command';

export class TriggerEventCommand extends EnvironmentWithUserCommand {
  static create(data: TriggerEventCommand) {
    return CommandHelper.create(TriggerEventCommand, data);
  }

  @IsDefined()
  @IsString()
  identifier: string;

  @IsDefined()
  payload: any; // eslint-disable-line @typescript-eslint/no-explicit-any

  @IsDefined()
  subscribers: any; // eslint-disable-line @typescript-eslint/no-explicit-any

  @IsUUID()
  @IsDefined()
  transactionId: string;
}
