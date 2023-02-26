import { EnvironmentWithSubscriber } from '../../../shared/commands/project.command';
import { IsBoolean, IsDefined, IsMongoId, IsOptional, ValidateNested } from 'class-validator';
import { ChannelPreference } from '../../../shared/dtos/channel-preference';

export class UpdateSubscriberPreferenceCommand extends EnvironmentWithSubscriber {
  @IsDefined()
  @IsMongoId()
  templateId: string;

  @IsBoolean()
  @IsOptional()
  enabled?: boolean;

  @ValidateNested()
  @IsOptional()
  channel?: ChannelPreference;
}
