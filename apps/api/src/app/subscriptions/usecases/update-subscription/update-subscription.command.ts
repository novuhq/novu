import { IsArray, IsDefined, IsOptional, IsString } from 'class-validator';
import { EnvironmentWithUserCommand } from '../../../shared/commands/project.command';
import { GroupPreferenceFilterDto } from '../../../shared/dtos/subscriptions/create-subscriptions.dto';

export class UpdateSubscriptionCommand extends EnvironmentWithUserCommand {
  @IsString()
  @IsDefined()
  topicKey: string;

  @IsString()
  @IsDefined()
  identifier: string;

  @IsString()
  @IsOptional()
  name?: string;

  @IsArray()
  @IsOptional()
  preferences?: Array<GroupPreferenceFilterDto>;

  @IsArray()
  @IsOptional()
  @IsString({ each: true })
  contextKeys?: string[];
}
