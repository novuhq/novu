import { IsDefined, IsString } from 'class-validator';
import { EnvironmentWithSubscriber } from '../../../shared/commands/project.command';

export class GetTopicSubscriptionCommand extends EnvironmentWithSubscriber {
  @IsString()
  @IsDefined()
  topicKey: string;

  @IsString()
  @IsDefined()
  subscriptionIdOrIdentifier: string;

  @IsString()
  @IsDefined()
  _subscriberId: string;
}
