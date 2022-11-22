import { EnvironmentCommand } from '../../../shared/commands/project.command';
import { IsNotEmpty } from 'class-validator';

export class MarkAllMessageAsSeenCommand extends EnvironmentCommand {
  @IsNotEmpty()
  readonly _subscriberId: string;

  @IsNotEmpty()
  readonly subscriberId: string;
}
