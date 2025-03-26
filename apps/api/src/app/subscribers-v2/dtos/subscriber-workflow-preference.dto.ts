import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { SubscriberPreferenceChannels } from '../../shared/dtos/preference-channels';
import { SubscriberPreferenceOverrideDto } from '../../subscribers/dtos';
import { SubscriberPreferencesWorkflowInfoDto } from './subscriber-preferences-workflow-info.dto';

export class SubscriberWorkflowPreferenceDto {
  @ApiProperty({ description: 'Whether notifications are enabled for this workflow' })
  enabled: boolean;

  @ApiProperty({
    description: 'Channel-specific preference settings for this workflow',
    type: SubscriberPreferenceChannels,
  })
  @Type(() => SubscriberPreferenceChannels)
  channels: SubscriberPreferenceChannels;

  @ApiProperty({ description: 'List of preference overrides', type: [SubscriberPreferenceOverrideDto] })
  @Type(() => SubscriberPreferenceOverrideDto)
  overrides: SubscriberPreferenceOverrideDto[];

  @ApiProperty({ description: 'Workflow information', type: SubscriberPreferencesWorkflowInfoDto })
  @Type(() => SubscriberPreferencesWorkflowInfoDto)
  workflow: SubscriberPreferencesWorkflowInfoDto;
}
