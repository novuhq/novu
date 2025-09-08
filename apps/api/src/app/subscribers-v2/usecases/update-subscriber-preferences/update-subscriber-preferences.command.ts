import { Type } from 'class-transformer';
import { IsDefined, IsOptional, IsString } from 'class-validator';
import { EnvironmentWithSubscriber } from '../../../shared/commands/project.command';
import { ScheduleDto } from '../../../shared/dtos/schedule';
import { PatchPreferenceChannelsDto } from '../../dtos/patch-subscriber-preferences.dto';

export class UpdateSubscriberPreferencesCommand extends EnvironmentWithSubscriber {
  @IsOptional()
  @IsString()
  readonly workflowIdOrInternalId?: string;

  @IsDefined()
  @Type(() => PatchPreferenceChannelsDto)
  readonly channels: PatchPreferenceChannelsDto;

  @IsOptional()
  @Type(() => ScheduleDto)
  readonly schedule?: ScheduleDto;
}
