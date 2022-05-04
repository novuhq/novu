import { AuthenticatedCommand } from '../../../shared/commands/authenticated.command';
import { CommandHelper } from '../../../shared/commands/command.helper';
import { IsBoolean, IsOptional } from 'class-validator';

export class UpdateOnBoardingCommand extends AuthenticatedCommand {
  static create(data: UpdateOnBoardingCommand) {
    return CommandHelper.create<UpdateOnBoardingCommand>(UpdateOnBoardingCommand, data);
  }

  @IsBoolean()
  @IsOptional()
  onBoarding?: boolean;
}
