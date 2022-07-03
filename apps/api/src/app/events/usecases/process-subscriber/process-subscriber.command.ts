import { IsDefined, IsString, IsUUID } from 'class-validator';
import { CommandHelper } from '../../../shared/commands/command.helper';
import { EnvironmentWithUserCommand } from '../../../shared/commands/project.command';
import { ISubscribersDefine } from '@novu/node';

export class ProcessSubscriberCommand extends EnvironmentWithUserCommand {
  static create(data: ProcessSubscriberCommand) {
    return CommandHelper.create(ProcessSubscriberCommand, data);
  }

  @IsDefined()
  @IsString()
  identifier: string;

  @IsDefined()
  payload: any; // eslint-disable-line @typescript-eslint/no-explicit-any

  @IsDefined()
  overrides: any; // eslint-disable-line @typescript-eslint/no-explicit-any

  @IsDefined()
  to: ISubscribersDefine; // eslint-disable-line @typescript-eslint/no-explicit-any

  @IsUUID()
  @IsDefined()
  transactionId: string;

  @IsDefined()
  templateId: string;
}
