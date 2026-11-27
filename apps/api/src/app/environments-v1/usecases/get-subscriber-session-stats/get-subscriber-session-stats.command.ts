import { IsInt } from 'class-validator';
import { EnvironmentCommand } from '../../../shared/commands/project.command';

export class GetSubscriberSessionStatsCommand extends EnvironmentCommand {
  @IsInt()
  readonly days: number;
}
