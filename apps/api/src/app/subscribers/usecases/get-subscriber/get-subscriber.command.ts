import { IsDefined, IsString } from 'class-validator';
import { EnvironmentCommand } from '../../../shared/commands/project.command';

export class GetSubscriberCommand extends EnvironmentCommand {
  @IsString()
  @IsDefined()
  subscriberId: string;
}
