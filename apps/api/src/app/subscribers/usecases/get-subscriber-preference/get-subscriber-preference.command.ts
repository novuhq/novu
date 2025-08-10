import { EnvironmentWithSubscriber } from '@novu/application-generic';
import { SeverityLevelEnum } from '@novu/shared';
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
}
