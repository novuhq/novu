import { IsDefined, IsString } from 'class-validator';
import { EnvironmentWithSubscriber } from '../../../shared/commands/project.command';

export class DeleteTopicSubscriptionCommand extends EnvironmentWithSubscriber {
  @IsString()
  @IsDefined()
  subscriptionId: string;

  @IsString()
  @IsDefined()
  _subscriberId: string;
}
