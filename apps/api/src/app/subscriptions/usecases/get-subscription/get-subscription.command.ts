import { IsDefined, IsString } from 'class-validator';
import { EnvironmentCommand } from '../../../shared/commands/project.command';

export class GetSubscriptionCommand extends EnvironmentCommand {
  @IsString()
  @IsDefined()
  topicKey: string;

  @IsString()
  @IsDefined()
  subscriptionIdOrIdentifier: string;
}
