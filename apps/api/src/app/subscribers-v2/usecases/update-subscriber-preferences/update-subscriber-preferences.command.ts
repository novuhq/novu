import { IsDefined, IsMongoId, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';
import { EnvironmentWithSubscriber } from '../../../shared/commands/project.command';
import { PatchPreferenceChannelsDto } from '../../dtos/patch-subscriber-preferences.dto';

export class UpdateSubscriberPreferencesCommand extends EnvironmentWithSubscriber {
  @IsOptional()
  @IsMongoId()
  readonly workflowId?: string;

  @IsDefined()
  @Type(() => PatchPreferenceChannelsDto)
  readonly channels: PatchPreferenceChannelsDto;
}
