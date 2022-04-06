import { IsNumber, IsOptional } from 'class-validator';
import { CommandHelper } from '../../../shared/commands/command.helper';
import { EnvironmentWithUserCommand } from '../../../shared/commands/project.command';

export class GetActivityGraphStatsCommand extends EnvironmentWithUserCommand {
  static create(data: GetActivityGraphStatsCommand) {
    return CommandHelper.create<GetActivityGraphStatsCommand>(GetActivityGraphStatsCommand, data);
  }

  @IsNumber()
  @IsOptional()
  days: number;
}
