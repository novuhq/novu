import { IsString } from 'class-validator';
import { EnvironmentWithUserCommand } from '../../../shared/commands/project.command';

export class DeleteFeedCommand extends EnvironmentWithUserCommand {
  @IsString()
  feedId: string;
}
