import { EnvironmentWithSubscriber } from '@novu/application-generic';
import { NotificationTemplateEntity, PreferencesEntity, SubscriberEntity } from '@novu/dal';
import { SeverityLevelEnum, WorkflowCriticalityEnum } from '@novu/shared';
import { IsArray, IsBoolean, IsDefined, IsEnum, IsOptional, IsString } from 'class-validator';

export class GetSubscriberPreferenceCommand extends EnvironmentWithSubscriber {
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @IsArray()
  @IsEnum(SeverityLevelEnum, { each: true })
  severity?: SeverityLevelEnum[];

  @IsBoolean()
  @IsDefined()
  includeInactiveChannels: boolean;

  @IsEnum(WorkflowCriticalityEnum)
  @IsOptional()
  criticality: WorkflowCriticalityEnum;

  @IsOptional()
  subscriber?: Pick<SubscriberEntity, '_id'>;

  @IsOptional()
  workflowList?: NotificationTemplateEntity[];

  /**
   * Optional pre-fetched SUBSCRIBER_GLOBAL preference entity. When provided, the use-case
   * will reuse this value instead of issuing its own SUBSCRIBER_GLOBAL mongo lookup inside
   * {@link findAllPreferences}. Pass `null` (and not `undefined`) to indicate that no
   * entity was found.
   */
  @IsOptional()
  subscriberGlobalPreference?: PreferencesEntity | null;
}
