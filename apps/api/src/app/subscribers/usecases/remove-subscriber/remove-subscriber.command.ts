import { IsString } from 'class-validator';
import { EnvironmentCommand } from '../../../shared/commands/project.command';

export class RemoveSubscriberCommand extends EnvironmentCommand {
  @IsString()
  subscriberId: string;
}
