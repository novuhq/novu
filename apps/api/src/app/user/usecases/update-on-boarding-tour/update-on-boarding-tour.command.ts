import { IsNumber, IsOptional } from 'class-validator';
import { AuthenticatedCommand } from '../../../shared/commands/authenticated.command';

export class UpdateOnBoardingTourCommand extends AuthenticatedCommand {
  @IsNumber()
  @IsOptional()
  showOnBoardingTour: number;
}
