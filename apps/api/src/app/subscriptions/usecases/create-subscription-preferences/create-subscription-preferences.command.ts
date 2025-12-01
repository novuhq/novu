import { NotificationTemplateEntity } from '@novu/dal';
import { IsArray, IsDefined, IsString } from 'class-validator';
import { EnvironmentWithUserCommand } from '../../../shared/commands/project.command';
import { GroupPreferenceFilterDto } from '../../../shared/dtos/subscriptions/create-subscriptions.dto';

export class CreateSubscriptionPreferencesCommand extends EnvironmentWithUserCommand {
  @IsArray()
  @IsDefined()
  preferences: GroupPreferenceFilterDto[];

  @IsDefined()
  @IsString()
  subscriptionId: string;

  @IsDefined()
  @IsString()
  _subscriberId: string;

  @IsArray()
  @IsDefined()
  workflows: NotificationTemplateEntity[];
}
