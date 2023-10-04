import { Type } from 'class-transformer';
import { IsBoolean, IsOptional, ValidateNested } from 'class-validator';
import { EnvironmentWithSubscriber } from '../../../shared/commands/project.command';
import { ChannelPreference } from '../../../shared/dtos/channel-preference';

export class UpdateSubscriberGlobalPreferencesCommand extends EnvironmentWithSubscriber {
  @IsBoolean()
  @IsOptional()
  enabled?: boolean;

  @IsOptional()
  @ValidateNested()
  @Type(() => ChannelPreference)
  preferences?: ChannelPreference[];
}
