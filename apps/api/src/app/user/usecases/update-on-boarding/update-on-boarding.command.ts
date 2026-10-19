import { IsBoolean, IsOptional } from 'class-validator';
import { AuthenticatedCommand } from '../../../shared/commands/authenticated.command';

export class UpdateOnBoardingCommand extends AuthenticatedCommand {
  @IsBoolean()
  @IsOptional()
  showOnBoarding?: boolean;
}
