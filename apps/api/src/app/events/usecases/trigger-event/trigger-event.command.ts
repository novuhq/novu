import { IsDefined, IsString } from 'class-validator';
import { CommandHelper } from '../../../shared/commands/command.helper';
import { EnvironmentWithUserCommand } from '../../../shared/commands/project.command';
import { ISubscribersDefine } from '@novu/node';

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
  overrides: Record<string, Record<string, unknown>>;

  @IsDefined()
  to: ISubscribersDefine[]; // eslint-disable-line @typescript-eslint/no-explicit-any

  @IsString()
  @IsDefined()
  transactionId: string;
}
