import { IsBoolean, IsDefined, IsEnum, IsOptional, ValidateIf } from 'class-validator';
import { PreferenceLevelEnum } from '@novu/shared';

import { EnvironmentWithSubscriber } from '../../../shared/commands/project.command';

export class UpdatePreferencesCommand extends EnvironmentWithSubscriber {
  @IsOptional()
  @ValidateIf((object) => object.level === PreferenceLevelEnum.TEMPLATE)
  readonly workflowIdOrIdentifier?: string;

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
}
