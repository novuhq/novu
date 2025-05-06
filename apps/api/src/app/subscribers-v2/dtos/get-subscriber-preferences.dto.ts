import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { SubscriberGlobalPreferenceDto } from './subscriber-global-preference.dto';
import { SubscriberWorkflowPreferenceDto } from './subscriber-workflow-preference.dto';

export class GetSubscriberPreferencesDto {
  @ApiProperty({ description: 'Global preference settings', type: SubscriberGlobalPreferenceDto })
  @Type(() => SubscriberGlobalPreferenceDto)
  global: SubscriberGlobalPreferenceDto;

  @ApiProperty({ description: 'Workflow-specific preference settings', type: [SubscriberWorkflowPreferenceDto] })
  @Type(() => SubscriberWorkflowPreferenceDto)
  workflows: SubscriberWorkflowPreferenceDto[];
}
