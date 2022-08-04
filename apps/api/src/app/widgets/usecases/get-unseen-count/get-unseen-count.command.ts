import { CommandHelper } from '../../../shared/commands/command.helper';
import { EnvironmentWithSubscriber } from '../../../shared/commands/project.command';
import { IsArray, IsBoolean, IsOptional } from 'class-validator';

export class GetUnseenCountCommand extends EnvironmentWithSubscriber {
  static create(data: GetUnseenCountCommand) {
    return CommandHelper.create<GetUnseenCountCommand>(GetUnseenCountCommand, data);
  }

  @IsOptional()
  @IsArray()
  feedId: string[];

  @IsBoolean()
  @IsOptional()
  seen?: boolean;
}
