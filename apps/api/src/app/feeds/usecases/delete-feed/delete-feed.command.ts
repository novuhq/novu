import { IsString } from 'class-validator';
import { CommandHelper } from '../../../shared/commands/command.helper';
import { EnvironmentWithUserCommand } from '../../../shared/commands/project.command';

export class DeleteFeedCommand extends EnvironmentWithUserCommand {
  static create(data: DeleteFeedCommand) {
    return CommandHelper.create<DeleteFeedCommand>(DeleteFeedCommand, data);
  }

  @IsString()
  feedId: string;
}
