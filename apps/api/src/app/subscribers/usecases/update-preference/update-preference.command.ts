import { IsBoolean, IsDefined, IsNotEmpty, IsOptional, IsString, ValidateNested } from 'class-validator';
import { CommandHelper } from '../../../shared/commands/command.helper';
import { EnvironmentCommand } from '../../../shared/commands/project.command';
import { IChannelPreference } from '@novu/shared';

export class UpdatePreferenceCommand extends EnvironmentCommand {
  static create(data: UpdatePreferenceCommand) {
    return CommandHelper.create(UpdatePreferenceCommand, data);
  }

  @IsString()
  @IsDefined()
  subscriberId: string;

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
