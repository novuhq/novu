import { EnvironmentWithSubscriber } from '../../../shared/commands/project.command';
import { IsBoolean, IsDefined, IsNotEmpty, IsOptional, IsString, ValidateNested } from 'class-validator';
import { IChannelPreference } from '@novu/shared';

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
  channel?: IChannelPreference;
}
