import { ArrayMaxSize, ArrayMinSize, IsArray, IsDefined, IsOptional, IsString } from 'class-validator';
import { EnvironmentWithUserCommand } from '../../../shared/commands/project.command';
import { GroupPreferenceFilterDto } from '../../../shared/dtos/subscriptions/create-subscriptions.dto';

export class TopicSubscriberIdentifier {
  @IsString()
  @IsDefined()
  identifier?: string;

  @IsString()
  @IsDefined()
  subscriberId: string;

  @IsString()
  @IsOptional()
  name?: string;
}

export class CreateSubscriptionsCommand extends EnvironmentWithUserCommand {
  @IsString()
  @IsDefined()
  topicKey: string;

  @IsArray()
  @IsDefined()
  @ArrayMinSize(1, { message: 'At least one subscription is required' })
  @ArrayMaxSize(100, { message: 'Cannot subscribe more than 100 subscriptions at once' })
  subscriptions: TopicSubscriberIdentifier[];

  @IsString()
  @IsOptional()
  name?: string;

  @IsArray()
  @IsOptional()
  preferences?: Array<GroupPreferenceFilterDto>;
}
