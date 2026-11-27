import { Type } from 'class-transformer';
import { IsDefined, IsString, ValidateNested } from 'class-validator';
import { EnvironmentWithSubscriber } from '../../../shared/commands/project.command';
import { CreateTopicSubscriptionRequestDto } from '../../dtos/create-topic-subscription-request.dto';

export class SubscribeToTopicCommand extends EnvironmentWithSubscriber {
  @IsString()
  @IsDefined()
  _subscriberId: string;

  @IsString()
  @IsDefined()
  topicKey: string;

  @IsDefined()
  @ValidateNested()
  @Type(() => CreateTopicSubscriptionRequestDto)
  request: CreateTopicSubscriptionRequestDto;
}
