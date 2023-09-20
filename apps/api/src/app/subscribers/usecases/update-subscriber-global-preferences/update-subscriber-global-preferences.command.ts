import { IsBoolean, IsDefined, IsOptional } from 'class-validator';
import { EnvironmentWithSubscriber } from '../../../shared/commands/project.command';
import { ChannelPreference } from '../../../shared/dtos/channel-preference';

export class UpdateSubscriberGlobalPreferencesCommand extends EnvironmentWithSubscriber {
  @IsBoolean()
  @IsOptional()
  enabled?: boolean;

  @IsDefined()
  preferences?: ChannelPreference[];
}
