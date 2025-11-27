import { IsArray, IsDefined, IsOptional, IsString } from 'class-validator';
import { EnvironmentWithUserCommand } from '../../../shared/commands/project.command';

export class DeleteTopicSubscriptionsCommand extends EnvironmentWithUserCommand {
  @IsString()
  @IsDefined()
  topicKey: string;

  /**
   * @deprecated Use subscriptions instead
   */
  @IsArray()
  @IsOptional()
  subscriberIds?: string[];

  @IsArray()
  @IsOptional()
  subscriptions?: Array<{ identifier?: string; subscriberId?: string }>;
}
