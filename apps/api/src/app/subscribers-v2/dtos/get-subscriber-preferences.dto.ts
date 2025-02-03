import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { PreferenceChannels } from '../../shared/dtos/preference-channels';
import { Overrides } from '../../subscribers/dtos/get-subscriber-preferences-response.dto';

export class WorkflowInfoDto {
  @ApiProperty({ description: 'Workflow slug' })
  slug: string;

  @ApiProperty({ description: 'Unique identifier of the workflow' })
  identifier: string;

  @ApiProperty({ description: 'Display name of the workflow' })
  name: string;
}

export class GlobalPreferenceDto {
  @ApiProperty({ description: 'Whether notifications are enabled globally' })
  enabled: boolean;

  @ApiProperty({ description: 'Channel-specific preference settings', type: PreferenceChannels })
  @Type(() => PreferenceChannels)
  channels: PreferenceChannels;
}

export class WorkflowPreferenceDto {
  @ApiProperty({ description: 'Whether notifications are enabled for this workflow' })
  enabled: boolean;

  @ApiProperty({ description: 'Channel-specific preference settings for this workflow', type: PreferenceChannels })
  @Type(() => PreferenceChannels)
  channels: PreferenceChannels;

  @ApiProperty({ description: 'List of preference overrides', type: [Overrides] })
  @Type(() => Overrides)
  overrides: Overrides[];

  @ApiProperty({ description: 'Workflow information', type: WorkflowInfoDto })
  @Type(() => WorkflowInfoDto)
  workflow: WorkflowInfoDto;
}

export class GetSubscriberPreferencesDto {
  @ApiProperty({ description: 'Global preference settings', type: GlobalPreferenceDto })
  @Type(() => GlobalPreferenceDto)
  global: GlobalPreferenceDto;

  @ApiProperty({ description: 'Workflow-specific preference settings', type: [WorkflowPreferenceDto] })
  @Type(() => WorkflowPreferenceDto)
  workflows: WorkflowPreferenceDto[];
}
