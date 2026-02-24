import { NotificationTemplateEntity, SubscriberEntity } from '@novu/dal';
import { IsBoolean, IsDefined, IsOptional } from 'class-validator';
import { EnvironmentWithSubscriber } from '../../../shared/commands/project.command';

export class GetSubscriberGlobalPreferenceCommand extends EnvironmentWithSubscriber {
  @IsBoolean()
  @IsDefined()
  includeInactiveChannels: boolean;

  @IsOptional()
  subscriber?: Pick<SubscriberEntity, '_id'>;

  @IsOptional()
  workflowList?: NotificationTemplateEntity[];
}
