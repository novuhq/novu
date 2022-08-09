import { AuthenticatedCommand } from '../../../shared/commands/authenticated.command';
import { IsBoolean, IsOptional } from 'class-validator';

export class UpdateOnBoardingCommand extends AuthenticatedCommand {
  @IsBoolean()
  @IsOptional()
  showOnBoarding?: boolean;
}
