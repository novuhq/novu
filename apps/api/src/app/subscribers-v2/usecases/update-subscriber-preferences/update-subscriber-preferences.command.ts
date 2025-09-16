import { Type } from 'class-transformer';
import { IsOptional, IsString } from 'class-validator';
import { EnvironmentWithSubscriber } from '../../../shared/commands/project.command';
import { ScheduleDto } from '../../../shared/dtos/schedule';
import { PatchPreferenceChannelsDto } from '../../dtos/patch-subscriber-preferences.dto';

export class UpdateSubscriberPreferencesCommand extends EnvironmentWithSubscriber {
  @IsOptional()
  @IsString()
  readonly workflowIdOrInternalId?: string;

  @IsOptional()
  @Type(() => PatchPreferenceChannelsDto)
  readonly channels?: PatchPreferenceChannelsDto;

  @IsOptional()
  @Type(() => ScheduleDto)
  readonly schedule?: ScheduleDto;
}
