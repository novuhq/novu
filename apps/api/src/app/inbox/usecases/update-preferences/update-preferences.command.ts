import { IsBoolean, IsDefined, IsEnum, IsMongoId, IsOptional, ValidateIf } from 'class-validator';
import { ButtonTypeEnum, MessageActionStatusEnum, PreferenceLevelEnum } from '@novu/shared';

import { EnvironmentWithSubscriber } from '../../../shared/commands/project.command';

export class UpdatePreferencesCommand extends EnvironmentWithSubscriber {
  @IsOptional()
  @ValidateIf((object) => object.level === PreferenceLevelEnum.TEMPLATE)
  @IsMongoId()
  readonly workflowId?: string;

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
}
