import { IsNumber, IsOptional, IsDate } from 'class-validator';
import { EnvironmentWithUserCommand } from '../../../shared/commands/project.command';

export class GetActivityGraphStatsCommand extends EnvironmentWithUserCommand {
  @IsNumber()
  @IsOptional()
  days: number;

  @IsOptional()
  startDate?: string;

  @IsOptional()
  endDate?: string;
}
