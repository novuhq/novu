import { IsDefined, IsOptional, IsString } from 'class-validator';
import { CommandHelper } from '../../../shared/commands/command.helper';
import { EnvironmentCommand } from '../../../shared/commands/project.command';

export class GetSubscriberCommand extends EnvironmentCommand {
  static create(data: GetSubscriberCommand) {
    return CommandHelper.create(GetSubscriberCommand, data);
  }

  @IsString()
  @IsDefined()
  subscriberId: string;
}
