import {
  BuilderFieldOperator,
  BuilderFieldType,
  BuilderGroupValues,
  DigestUnitEnum,
  DigestTypeEnum,
} from '@novu/shared';
import { PreferenceChannels } from './update-subscriber-preference-response.dto';
import { MessageTemplateDto } from '../../notification-template/dto/message-template.dto';
import { ApiExtraModels, ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

class NotificationTriggerVariable {
  name: string;
}

export class NotificationTrigger {
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

class NotificationStepMetadata {
  @ApiPropertyOptional()
  amount?: number;

  @ApiPropertyOptional({
    enum: DigestUnitEnum,
  })
  unit?: DigestUnitEnum;

  @ApiPropertyOptional()
  digestKey?: string;

  @ApiProperty({
    enum: DigestTypeEnum,
  })
  type: DigestTypeEnum;

  @ApiPropertyOptional({
    enum: DigestUnitEnum,
  })
  backoffUnit?: DigestUnitEnum;

  @ApiPropertyOptional()
  backoffAmount?: number;

  @ApiPropertyOptional()
  updateMode?: boolean;
}

class StepFilterChild {
  @ApiProperty()
  field: string;
  @ApiProperty()
  value: string;
  @ApiProperty({
    enum: [
      'LARGER',
      'SMALLER',
      'LARGER_EQUAL',
      'SMALLER_EQUAL',
      'EQUAL',
      'NOT_EQUAL',
      'ALL_IN',
      'ANY_IN',
      'NOT_IN',
      'BETWEEN',
      'NOT_BETWEEN',
      'LIKE',
      'NOT_LIKE',
    ],
  })
  operator: BuilderFieldOperator;
}

export class StepFilter {
  @ApiProperty()
  isNegated: boolean;

  @ApiProperty({
    enum: ['BOOLEAN', 'TEXT', 'DATE', 'NUMBER', 'STATEMENT', 'LIST', 'MULTI_LIST', 'GROUP'],
  })
  type: BuilderFieldType;

  @ApiProperty({
    enum: ['AND', 'OR'],
  })
  value: BuilderGroupValues;

  @ApiProperty({
    type: [StepFilterChild],
  })
  children: StepFilterChild[];
}

export class NotificationStep {
  @ApiPropertyOptional()
  _id?: string;

  @ApiProperty()
  _templateId: string;

  @ApiPropertyOptional()
  active?: boolean;

  @ApiPropertyOptional({
    type: MessageTemplateDto,
  })
  template?: MessageTemplateDto;

  @ApiPropertyOptional({
    type: [StepFilter],
  })
  filters?: StepFilter[];

  @ApiPropertyOptional()
  _parentId?: string;

  @ApiPropertyOptional({
    type: NotificationStepMetadata,
  })
  metadata?: NotificationStepMetadata;
}

export class NotificationGroup {
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

@ApiExtraModels(
  NotificationGroup,
  NotificationStep,
  StepFilter,
  StepFilterChild,
  NotificationStepMetadata,
  NotificationTrigger,
  NotificationTriggerVariable
)
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
