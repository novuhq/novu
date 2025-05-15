import { IsArray, IsDefined, IsString } from 'class-validator';
import { EnvironmentWithUserCommand } from '../../../shared/commands/project.command';

export class DeleteTopicSubscriptionsCommand extends EnvironmentWithUserCommand {
  @IsString()
  @IsDefined()
  topicKey: string;

  @IsArray()
  @IsDefined()
  subscriberIds: string[];
}
