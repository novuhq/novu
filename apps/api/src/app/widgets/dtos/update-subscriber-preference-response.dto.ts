import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PreferenceChannels } from '../../shared/dtos/preference-channels';
import {
  INotificationTrigger,
  INotificationTriggerVariable,
  ITemplateConfiguration,
  ITriggerReservedVariable,
  TemplateVariableTypeEnum,
  TriggerContextTypeEnum,
  TriggerTypeEnum,
} from '@novu/shared';

class Preference {
  @ApiProperty({
    description: 'Sets if the workflow is fully enabled for all channels or not for the subscriber.',
    type: Boolean,
  })
  enabled: boolean;

  @ApiProperty({
    type: PreferenceChannels,
    description: 'Subscriber preferences for the different channels regarding this workflow',
  })
  channels: PreferenceChannels;
}

export class NotificationTriggerVariableResponse implements INotificationTriggerVariable {
  @ApiProperty({
    type: String,
    description: 'The name of the variable',
  })
  name: string;

  @ApiPropertyOptional()
  @ApiProperty({
    description: 'The value of the variable',
  })
  value?: any;

  @ApiPropertyOptional()
  @ApiProperty({
    type: TemplateVariableTypeEnum,
    description: 'The type of the variable',
  })
  type?: TemplateVariableTypeEnum;
}

export class TriggerReservedVariableResponse implements ITriggerReservedVariable {
  @ApiProperty({
    type: TriggerContextTypeEnum,
    description: 'The type of the reserved variable',
  })
  type: TriggerContextTypeEnum;

  @ApiProperty({
    type: Array<NotificationTriggerVariableResponse>,
    description: 'The reserved variables of the trigger',
  })
  variables: NotificationTriggerVariableResponse[];
}

export class NotificationTriggerResponse implements INotificationTrigger {
  @ApiProperty({
    type: TriggerTypeEnum,
    description: 'The type of the trigger',
  })
  type: TriggerTypeEnum;

  @ApiProperty({
    type: String,
    description: 'The identifier of the trigger',
  })
  identifier: string;

  @ApiProperty({
    type: Array<NotificationTriggerVariableResponse>,
    description: 'The variables of the trigger',
  })
  variables: NotificationTriggerVariableResponse[];

  @ApiPropertyOptional()
  @ApiProperty({
    type: Array<NotificationTriggerVariableResponse>,
    description: 'The subscriber variables of the trigger',
  })
  subscriberVariables?: NotificationTriggerVariableResponse[];

  @ApiPropertyOptional()
  @ApiProperty({
    type: Array<TriggerReservedVariableResponse>,
    description: 'The reserved variables of the trigger',
  })
  reservedVariables?: TriggerReservedVariableResponse[];
}

class TemplateResponse implements ITemplateConfiguration {
  @ApiProperty({
    description: 'Unique identifier of the workflow',
    type: String,
  })
  _id: string;

  @ApiProperty({
    description: 'Name of the workflow',
    type: String,
  })
  name: string;

  @ApiProperty({
    description:
      'Critical templates will always be delivered to the end user and should be hidden from the subscriber preferences screen',
    type: Boolean,
  })
  critical: boolean;

  @ApiProperty({
    description: 'Triggers are the events that will trigger the workflow.',
    type: Array<NotificationTriggerResponse>,
  })
  triggers: NotificationTriggerResponse[];
}

export class UpdateSubscriberPreferenceResponseDto {
  @ApiProperty({
    type: TemplateResponse,
    description: 'The workflow information and if it is critical or not',
  })
  template: TemplateResponse;

  @ApiProperty({
    type: Preference,
    description: 'The preferences of the subscriber regarding the related workflow',
  })
  preference: Preference;
}
