import { IsArray, IsDefined, IsOptional, IsString } from 'class-validator';
import { EnvironmentWithSubscriber } from '../../../shared/commands/project.command';

export class DeleteTopicSubscriptionCommand extends EnvironmentWithSubscriber {
  @IsString()
  @IsDefined()
  topicKey: string;

  @IsString()
  @IsDefined()
  identifier: string;

  @IsString()
  @IsDefined()
  _subscriberId: string;

  @IsArray()
  @IsOptional()
  @IsString({ each: true })
  contextKeys?: string[];
}
