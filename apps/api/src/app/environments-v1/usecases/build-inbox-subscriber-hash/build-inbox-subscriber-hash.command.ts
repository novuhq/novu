import { IsNotEmpty, IsString } from 'class-validator';
import { EnvironmentWithUserCommand } from '../../../shared/commands/project.command';

export class BuildInboxSubscriberHashCommand extends EnvironmentWithUserCommand {
  @IsString()
  @IsNotEmpty()
  readonly subscriberId: string;
}
