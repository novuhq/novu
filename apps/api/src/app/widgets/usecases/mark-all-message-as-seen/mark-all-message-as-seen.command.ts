import { EnvironmentWithSubscriber } from '../../../shared/commands/project.command';
import { IsNotEmpty } from 'class-validator';

export class MarkAllMessageAsSeenCommand extends EnvironmentWithSubscriber {
  @IsNotEmpty()
  readonly _subscriberId: string;
}
