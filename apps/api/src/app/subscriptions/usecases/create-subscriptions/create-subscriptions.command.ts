import { IsValidContextPayload } from '@novu/application-generic';
import { ContextPayload } from '@novu/shared';
import { Type } from 'class-transformer';
import { ArrayMaxSize, ArrayMinSize, IsArray, IsDefined, IsOptional, IsString, ValidateNested } from 'class-validator';
import { EnvironmentWithUserCommand } from '../../../shared/commands/project.command';
import { GroupPreferenceFilterDto } from '../../../shared/dtos/subscriptions/create-subscriptions.dto';

export class TopicSubscriberIdentifier {
  @IsString()
  @IsOptional()
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
  @ValidateNested({ each: true })
  @Type(() => TopicSubscriberIdentifier)
  subscriptions: TopicSubscriberIdentifier[];

  @IsString()
  @IsOptional()
  name?: string;

  @IsArray()
  @IsOptional()
  preferences?: Array<GroupPreferenceFilterDto>;

  @IsValidContextPayload({ maxCount: 5 })
  @IsOptional()
  context?: ContextPayload;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  contextKeys?: string[];
}
