import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { type CustomDataType, type IPreferenceChannels, PreferenceLevelEnum, SeverityLevelEnum } from '@novu/shared';
import type { RulesLogic } from 'json-logic-js';

export class PreferenceChannelsDto implements IPreferenceChannels {
  @ApiPropertyOptional({ description: 'Whether email notifications are enabled' })
  email?: boolean;

  @ApiPropertyOptional({ description: 'Whether SMS notifications are enabled' })
  sms?: boolean;

  @ApiPropertyOptional({ description: 'Whether Inbox notifications are enabled' })
  in_app?: boolean;

  @ApiPropertyOptional({ description: 'Whether chat notifications are enabled' })
  chat?: boolean;

  @ApiPropertyOptional({ description: 'Whether push notifications are enabled' })
  push?: boolean;

  @ApiPropertyOptional({ description: 'Whether tool notifications are enabled' })
  tool?: boolean;
}

export class PreferenceWebhookWorkflowDto {
  @ApiProperty({ description: 'Database identifier of the workflow' })
  id: string;

  @ApiPropertyOptional({
    description: 'Workflow identifier used when triggering the workflow. May be absent for subscription preferences.',
  })
  identifier?: string;

  @ApiProperty({ description: 'Name of the workflow' })
  name: string;

  @ApiProperty({ description: 'Whether the workflow ignores subscriber preferences' })
  critical: boolean;

  @ApiProperty({ enum: SeverityLevelEnum, enumName: 'SeverityLevelEnum', description: 'Workflow severity' })
  severity: SeverityLevelEnum;

  @ApiPropertyOptional({ type: [String], description: 'Tags assigned to the workflow' })
  tags?: string[];

  @ApiPropertyOptional({ type: 'object', additionalProperties: true, description: 'Custom workflow data' })
  data?: CustomDataType;
}

export class PreferenceWebhookTimeRangeDto {
  @ApiProperty({ description: 'Start of the delivery window' })
  start: string;

  @ApiProperty({ description: 'End of the delivery window' })
  end: string;
}

export class PreferenceWebhookDayScheduleDto {
  @ApiProperty({ description: 'Whether delivery is enabled on this weekday' })
  isEnabled: boolean;

  @ApiPropertyOptional({ type: [PreferenceWebhookTimeRangeDto], description: 'Delivery windows for this weekday' })
  hours?: PreferenceWebhookTimeRangeDto[];
}

export class PreferenceWebhookWeeklyScheduleDto {
  @ApiPropertyOptional({ type: () => PreferenceWebhookDayScheduleDto })
  monday?: PreferenceWebhookDayScheduleDto;

  @ApiPropertyOptional({ type: () => PreferenceWebhookDayScheduleDto })
  tuesday?: PreferenceWebhookDayScheduleDto;

  @ApiPropertyOptional({ type: () => PreferenceWebhookDayScheduleDto })
  wednesday?: PreferenceWebhookDayScheduleDto;

  @ApiPropertyOptional({ type: () => PreferenceWebhookDayScheduleDto })
  thursday?: PreferenceWebhookDayScheduleDto;

  @ApiPropertyOptional({ type: () => PreferenceWebhookDayScheduleDto })
  friday?: PreferenceWebhookDayScheduleDto;

  @ApiPropertyOptional({ type: () => PreferenceWebhookDayScheduleDto })
  saturday?: PreferenceWebhookDayScheduleDto;

  @ApiPropertyOptional({ type: () => PreferenceWebhookDayScheduleDto })
  sunday?: PreferenceWebhookDayScheduleDto;
}

export class PreferenceWebhookScheduleDto {
  @ApiProperty({ description: 'Whether the delivery schedule is enabled' })
  isEnabled: boolean;

  @ApiPropertyOptional({ type: () => PreferenceWebhookWeeklyScheduleDto })
  weeklySchedule?: PreferenceWebhookWeeklyScheduleDto;
}

export class PreferenceWebhookObjectDto {
  @ApiProperty({
    enum: PreferenceLevelEnum,
    enumName: 'PreferenceLevelEnum',
    description: 'Whether this preference is global or workflow-specific',
  })
  level: PreferenceLevelEnum;

  @ApiProperty({ description: 'Whether notifications are enabled' })
  enabled: boolean;

  @ApiProperty({ type: () => PreferenceChannelsDto })
  channels: PreferenceChannelsDto;

  @ApiPropertyOptional({ description: 'Topic subscription identifier' })
  subscriptionId?: string;

  @ApiPropertyOptional({ type: () => PreferenceWebhookWorkflowDto })
  workflow?: PreferenceWebhookWorkflowDto;

  @ApiPropertyOptional({ type: () => PreferenceWebhookScheduleDto })
  schedule?: PreferenceWebhookScheduleDto;

  @ApiPropertyOptional({
    type: 'object',
    additionalProperties: true,
    description: 'JsonLogic condition controlling whether this preference applies',
  })
  condition?: RulesLogic;
}

export class PreferenceWebhookPayloadDto {
  @ApiProperty({ type: () => PreferenceWebhookObjectDto })
  object: PreferenceWebhookObjectDto;

  @ApiProperty({ description: 'Identifier of the subscriber whose preference changed' })
  subscriberId: string;
}
