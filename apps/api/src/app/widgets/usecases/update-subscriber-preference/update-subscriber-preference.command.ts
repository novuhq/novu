import { CommandHelper } from '../../../shared/commands/command.helper';
import { EnvironmentWithSubscriber } from '../../../shared/commands/project.command';
import { IsBoolean, IsDefined, IsNotEmpty, IsOptional, IsString, ValidateNested } from 'class-validator';
import { IChannelPreference } from '../../dtos/user-preference.dto';

export class UpdateSubscriberPreferenceCommand extends EnvironmentWithSubscriber {
  static create(data: UpdateSubscriberPreferenceCommand) {
    return CommandHelper.create<UpdateSubscriberPreferenceCommand>(UpdateSubscriberPreferenceCommand, data);
  }

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
