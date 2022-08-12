import { ApiExtraModels, ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { NotificationStep } from '../../shared/dtos/notification-step';
import { PreferenceChannels } from '../../shared/dtos/preference-channels';

class NotificationGroup {
  @ApiPropertyOptional()
  _id?: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  _environmentId: string;

  @ApiProperty()
  _organizationId: string;

  @ApiPropertyOptional()
  _parentId?: string;
}

class NotificationTriggerVariable {
  name: string;
}

class NotificationTrigger {
  @ApiProperty()
  type: 'event';

  @ApiProperty()
  identifier: string;

  @ApiProperty({
    type: [NotificationTriggerVariable],
  })
  variables: NotificationTriggerVariable[];

  @ApiProperty({
    type: [NotificationTriggerVariable],
  })
  subscriberVariables?: NotificationTriggerVariable[];
}

@ApiExtraModels(NotificationGroup)
export class NotificationTemplateResponse {
  @ApiPropertyOptional()
  _id?: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  description: string;

  @ApiProperty()
  active: boolean;

  @ApiProperty()
  draft: boolean;

  @ApiProperty({
    type: PreferenceChannels,
  })
  preferenceSettings: PreferenceChannels;

  @ApiProperty()
  critical: boolean;

  @ApiProperty()
  tags: string[];

  @ApiProperty({
    type: [NotificationStep],
  })
  steps: NotificationStep[];

  @ApiProperty()
  _organizationId: string;

  @ApiProperty()
  _creatorId: string;

  @ApiProperty()
  _environmentId: string;

  @ApiProperty({
    type: [NotificationTrigger],
  })
  triggers: NotificationTrigger[];

  @ApiProperty()
  _notificationGroupId: string;

  @ApiPropertyOptional()
  _parentId?: string;

  @ApiProperty()
  deleted: boolean;

  @ApiProperty()
  deletedAt: string;

  @ApiProperty()
  deletedBy: string;

  @ApiPropertyOptional({
    type: NotificationGroup,
  })
  readonly notificationGroup?: NotificationGroup;
}
