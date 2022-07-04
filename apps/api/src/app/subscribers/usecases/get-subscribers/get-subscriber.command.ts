import { IsNumber, IsOptional } from 'class-validator';
import { CommandHelper } from '../../../shared/commands/command.helper';
import { EnvironmentCommand } from '../../../shared/commands/project.command';

export class GetSubscribersCommand extends EnvironmentCommand {
  static create(data: GetSubscribersCommand) {
    return CommandHelper.create(GetSubscribersCommand, data);
  }

  @IsNumber()
  @IsOptional()
  page: number;
}
