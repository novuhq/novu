import { IsNumber, IsOptional } from 'class-validator';
import { EnvironmentWithUserCommand } from '../../../shared/commands/project.command';

export class GetActivityGraphStatsCommand extends EnvironmentWithUserCommand {
  @IsNumber()
  @IsOptional()
  days: number;
}
