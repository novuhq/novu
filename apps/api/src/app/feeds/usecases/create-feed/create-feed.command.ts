import { IsString } from 'class-validator';
import { CommandHelper } from '../../../shared/commands/command.helper';
import { EnvironmentWithUserCommand } from '../../../shared/commands/project.command';

export class CreateFeedCommand extends EnvironmentWithUserCommand {
  static create(data: CreateFeedCommand) {
    return CommandHelper.create<CreateFeedCommand>(CreateFeedCommand, data);
  }

  @IsString()
  name: string;
}
