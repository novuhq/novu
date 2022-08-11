import { EnvironmentWithSubscriber } from '../../../shared/commands/project.command';
import { IsBoolean, IsDefined, IsNotEmpty, IsOptional, IsString, ValidateNested } from 'class-validator';
import { ChannelPreference } from '../../dtos/update-subscriber-preference-request.dto';

export class UpdateSubscriberPreferenceCommand extends EnvironmentWithSubscriber {
  @IsDefined()
  @IsNotEmpty()
  @IsString()
  templateId: string;

  @IsBoolean()
  @IsOptional()
  enabled?: boolean;

  @ValidateNested()
  @IsOptional()
  channel?: ChannelPreference;
}
