import { IsNumber, IsOptional } from 'class-validator';
import { CommandHelper } from '../../../shared/commands/command.helper';
import { ApplicationWithUserCommand } from '../../../shared/commands/project.command';

export class GetActivityGraphStatsCommand extends ApplicationWithUserCommand {
  static create(data: GetActivityGraphStatsCommand) {
    return CommandHelper.create<GetActivityGraphStatsCommand>(GetActivityGraphStatsCommand, data);
  }

  @IsNumber()
  @IsOptional()
  days: number;
}
