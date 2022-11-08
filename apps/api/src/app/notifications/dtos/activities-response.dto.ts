import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ChatProviderIdEnum,
  EmailProviderIdEnum,
  ExecutionDetailsSourceEnum,
  ExecutionDetailsStatusEnum,
  InAppProviderIdEnum,
  MessageTemplateDto,
  PushProviderIdEnum,
  StepTypeEnum,
} from '@novu/shared';
import { StepFilter } from '@novu/dal';

type ProvidersEnum = ChatProviderIdEnum | EmailProviderIdEnum | InAppProviderIdEnum | PushProviderIdEnum;

class ActivityNotificationStepTemplateResponseDto {
  @ApiProperty()
  _id: string;

  @ApiProperty()
  active: boolean;

  @ApiPropertyOptional()
  content?: Record<string, unknown>[];

  @ApiPropertyOptional()
  contentType?: string;

  @ApiPropertyOptional()
  name?: string;

  @ApiPropertyOptional()
  subject?: string;

  @ApiProperty()
  type: StepTypeEnum;
}

class ActivityNotificationStepResponseDto {
  @ApiProperty()
  _id: string;

  @ApiProperty()
  active: boolean;

  @ApiProperty()
  filters: StepFilter;

  @ApiPropertyOptional()
  template?: MessageTemplateDto;
}

class ActivityNotificationExecutionDetailResponseDto {
  @ApiProperty()
  _id: string;

  @ApiProperty()
  _jobId: string;

  @ApiProperty({
    enum: ExecutionDetailsStatusEnum,
  })
  status: ExecutionDetailsStatusEnum;

  @ApiProperty()
  detail: string;

  @ApiProperty()
  isRetry: boolean;

  @ApiProperty()
  isTest: boolean;

  @ApiProperty()
  providerId: ProvidersEnum;

  @ApiPropertyOptional()
  raw?: string;

  @ApiProperty({
    enum: ExecutionDetailsSourceEnum,
  })
  source: ExecutionDetailsSourceEnum;
}

class ActivityNotificationJobResponseDto {
  @ApiProperty()
  _id: string;

  @ApiProperty()
  type: string;

  @ApiPropertyOptional()
  digest?: Record<string, unknown>;

  @ApiProperty()
  executionDetails: ActivityNotificationExecutionDetailResponseDto[];

  @ApiProperty()
  step: ActivityNotificationStepResponseDto;

  @ApiPropertyOptional()
  payload?: Record<string, unknown>;

  @ApiProperty()
  providerId: ProvidersEnum;

  @ApiProperty()
  status: string;
}

class ActivityNotificationSubscriberResponseDto {
  @ApiPropertyOptional()
  firstName?: string;

  @ApiProperty()
  _id: string;

  @ApiPropertyOptional()
  lastName?: string;

  @ApiPropertyOptional()
  email?: string;

  @ApiPropertyOptional()
  phone?: string;
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

class ActivityNotificationTemplateResponseDto {
  @ApiPropertyOptional()
  _id?: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  triggers: NotificationTrigger[];
}

export class ActivityNotificationResponseDto {
  @ApiPropertyOptional()
  _id?: string;

  @ApiProperty()
  _environmentId: string;

  @ApiProperty()
  _organizationId: string;

  @ApiProperty()
  transactionId: string;

  @ApiPropertyOptional()
  createdAt?: Date;

  @ApiPropertyOptional({
    enum: StepTypeEnum,
  })
  channels?: StepTypeEnum[];

  @ApiPropertyOptional()
  subscriber?: ActivityNotificationSubscriberResponseDto;

  @ApiPropertyOptional()
  template?: ActivityNotificationTemplateResponseDto;

  @ApiPropertyOptional()
  jobs?: ActivityNotificationJobResponseDto[];
}

export class ActivitiesResponseDto {
  @ApiProperty()
  totalCount: number;

  @ApiProperty()
  data: ActivityNotificationResponseDto[];

  @ApiProperty()
  pageSize: number;

  @ApiProperty()
  page: number;
}
