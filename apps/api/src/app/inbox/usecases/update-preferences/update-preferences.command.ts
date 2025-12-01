import { EnvironmentEntity, NotificationTemplateEntity, SubscriberEntity } from '@novu/dal';
import { PreferenceLevelEnum, Schedule } from '@novu/shared';
import { IsBoolean, IsDefined, IsEnum, IsOptional, ValidateIf } from 'class-validator';
import { RulesLogic } from 'json-logic-js';
import { EnvironmentWithSubscriber } from '../../../shared/commands/project.command';

class AllPreferences {
  enabled?: boolean;
  condition?: RulesLogic;
}

export class UpdatePreferencesCommand extends EnvironmentWithSubscriber {
  @IsOptional()
  @ValidateIf((object) => object.level === PreferenceLevelEnum.TEMPLATE)
  readonly workflowIdOrIdentifier?: string;

  @IsOptional()
  @ValidateIf((object) => object.level === PreferenceLevelEnum.TEMPLATE)
  readonly subscriptionIdOrIdentifier?: string;

  all?: AllPreferences;

  @IsOptional()
  @IsBoolean()
  readonly email?: boolean;

  @IsOptional()
  @IsBoolean()
  readonly sms?: boolean;

  @IsOptional()
  @IsBoolean()
  readonly in_app?: boolean;

  @IsOptional()
  @IsBoolean()
  readonly chat?: boolean;

  @IsOptional()
  @IsBoolean()
  readonly push?: boolean;

  @IsDefined()
  @IsEnum(PreferenceLevelEnum)
  readonly level: PreferenceLevelEnum;

  @IsDefined()
  @IsBoolean()
  readonly includeInactiveChannels: boolean;

  @IsOptional()
  readonly subscriber?: SubscriberEntity;

  @IsOptional()
  readonly workflow?: NotificationTemplateEntity;

  @IsOptional()
  readonly environment?: EnvironmentEntity;

  @IsOptional()
  readonly schedule?: Schedule;
}
