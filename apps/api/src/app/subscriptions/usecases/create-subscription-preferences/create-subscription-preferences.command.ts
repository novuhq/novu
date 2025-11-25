import { NotificationTemplateEntity } from '@novu/dal';
import { Type } from 'class-transformer';
import { IsArray, IsDefined, IsString, ValidateNested } from 'class-validator';
import { EnvironmentWithUserCommand } from '../../../shared/commands/project.command';
import { GroupPreferenceFilterDto } from '../../../shared/dtos/subscriptions/create-subscriptions.dto';

export class CreateSubscriptionPreferencesCommand extends EnvironmentWithUserCommand {
  @IsArray()
  @IsDefined()
  @ValidateNested({ each: true })
  @Type(() => GroupPreferenceFilterDto)
  preferences: GroupPreferenceFilterDto[];

  @IsDefined()
  @IsString()
  subscriptionId: string;

  @IsDefined()
  @IsString()
  _subscriberId: string;

  @IsArray()
  @IsDefined()
  @ValidateNested({ each: true })
  @Type(() => NotificationTemplateEntity)
  workflows: NotificationTemplateEntity[];
}
