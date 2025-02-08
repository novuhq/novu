import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  DaysEnum,
  DigestTypeEnum,
  DigestUnitEnum,
  ExecutionDetailsSourceEnum,
  ExecutionDetailsStatusEnum,
  MessageTemplateDto,
  MonthlyTypeEnum,
  OrdinalEnum,
  OrdinalValueEnum,
  ProvidersIdEnum,
  ProvidersIdEnumConst,
  StepTypeEnum,
  TriggerTypeEnum,
} from '@novu/shared';
import { IsArray, IsEnum, IsNumber, IsOptional, IsString } from 'class-validator';
import { StepFilterDto } from '../../shared/dtos/step-filter-dto';

export class DigestTimedConfigDto {
  @ApiPropertyOptional({ description: 'Time at which the digest is triggered' })
  @IsOptional()
  @IsString()
  atTime?: string;

  @ApiPropertyOptional({ description: 'Days of the week for the digest', type: [String], enum: DaysEnum })
  @IsOptional()
  @IsArray()
  @IsEnum(DaysEnum, { each: true })
  weekDays?: DaysEnum[];

  @ApiPropertyOptional({ description: 'Specific days of the month for the digest', type: [Number] })
  @IsOptional()
  @IsArray()
  @IsNumber({}, { each: true })
  monthDays?: number[];

  @ApiPropertyOptional({
    description: 'Ordinal position for the digest',
    enum: [...Object.values(OrdinalEnum)],
    enumName: 'OrdinalEnum',
  })
  @IsOptional()
  @IsEnum(OrdinalEnum)
  ordinal?: OrdinalEnum;

  @ApiPropertyOptional({
    description: 'Value of the ordinal',
    enum: [...Object.values(OrdinalValueEnum)],
    enumName: 'OrdinalValueEnum',
  })
  @IsOptional()
  @IsEnum(OrdinalValueEnum)
  ordinalValue?: OrdinalValueEnum;

  @ApiPropertyOptional({
    description: 'Type of monthly schedule',
    enum: [...Object.values(MonthlyTypeEnum)],
    enumName: 'MonthlyTypeEnum',
  })
  @IsOptional()
  @IsEnum(MonthlyTypeEnum)
  monthlyType?: MonthlyTypeEnum;

  @ApiPropertyOptional({ description: 'Cron expression for scheduling' })
  @IsOptional()
  @IsString()
  cronExpression?: string;
}

export class DigestMetadataDto {
  @ApiPropertyOptional({ description: 'Optional key for the digest' })
  digestKey?: string;

  @ApiPropertyOptional({ description: 'Amount for the digest', type: Number })
  amount?: number;

  @ApiPropertyOptional({ description: 'Unit of the digest', enum: DigestUnitEnum })
  unit?: DigestUnitEnum;

  @ApiProperty({
    enum: [...Object.values(DigestTypeEnum)],
    enumName: 'DigestTypeEnum',
    description: 'The Digest Type',
    type: String,
  })
  type: DigestTypeEnum;

  @ApiPropertyOptional({
    type: 'array',
    items: {
      type: 'object',
      additionalProperties: true,
    },
    description: 'Optional array of events associated with the digest, represented as key-value pairs',
  })
  events?: Record<string, unknown>[];

  // Properties for Regular Digest
  @ApiPropertyOptional({
    description: 'Regular digest: Indicates if backoff is enabled for the regular digest',
    type: Boolean,
  })
  backoff?: boolean;

  @ApiPropertyOptional({ description: 'Regular digest: Amount for backoff', type: Number })
  backoffAmount?: number;

  @ApiPropertyOptional({
    description: 'Regular digest: Unit for backoff',
    enum: [...Object.values(DigestUnitEnum)],
    enumName: 'DigestUnitEnum',
  })
  backoffUnit?: DigestUnitEnum;

  @ApiPropertyOptional({ description: 'Regular digest: Indicates if the digest should update', type: Boolean })
  updateMode?: boolean;

  // Properties for Timed Digest
  @ApiPropertyOptional({ description: 'Configuration for timed digest', type: () => DigestTimedConfigDto })
  timed?: DigestTimedConfigDto;
}

export class ActivityNotificationStepResponseDto {
  @ApiProperty({ description: 'Unique identifier of the step', type: String })
  _id: string;

  @ApiProperty({ description: 'Whether the step is active or not', type: Boolean })
  active: boolean;

  @ApiPropertyOptional({ description: 'Reply callback settings', type: Object })
  replyCallback?: {
    active: boolean;
    url: string;
  };

  @ApiPropertyOptional({ description: 'Control variables', type: Object })
  controlVariables?: Record<string, unknown>;

  @ApiPropertyOptional({ description: 'Metadata for the workflow step', type: Object })
  metadata?: any; // Adjust the type based on your actual metadata structure

  @ApiPropertyOptional({ description: 'Step issues', type: Object })
  issues?: any; // Adjust the type based on your actual issues structure

  @ApiProperty({ description: 'Filter criteria for the step', isArray: true, type: StepFilterDto })
  filters: StepFilterDto[];

  @ApiPropertyOptional({ description: 'Optional template for the step', type: MessageTemplateDto })
  template?: MessageTemplateDto;

  @ApiPropertyOptional({ description: 'Variants of the step', type: [ActivityNotificationStepResponseDto] })
  variants?: ActivityNotificationStepResponseDto[]; // Assuming variants are the same type

  @ApiProperty({ description: 'The identifier for the template associated with this step', type: String })
  _templateId: string;

  @ApiPropertyOptional({ description: 'The name of the step', type: String })
  name?: string;

  @ApiPropertyOptional({ description: 'The unique identifier for the parent step', type: String })
  _parentId?: string | null;
}
// Activity Notification Execution Detail Response DTO
export class ActivityNotificationExecutionDetailResponseDto {
  @ApiProperty({ description: 'Unique identifier of the execution detail', type: String })
  _id: string;

  @ApiPropertyOptional({ description: 'Creation time of the execution detail', type: String })
  createdAt?: string;

  @ApiProperty({
    enum: [...Object.values(ExecutionDetailsStatusEnum)],
    enumName: 'ExecutionDetailsStatusEnum',
    description: 'Status of the execution detail',
    type: String,
  })
  status: ExecutionDetailsStatusEnum;

  @ApiProperty({ description: 'Detailed information about the execution', type: String })
  detail: string;

  @ApiProperty({ description: 'Whether the execution is a retry or not', type: Boolean })
  isRetry: boolean;

  @ApiProperty({ description: 'Whether the execution is a test or not', type: Boolean })
  isTest: boolean;

  @ApiProperty({
    enum: [...new Set([...Object.values(ProvidersIdEnumConst).flatMap((enumObj) => Object.values(enumObj))])],
    enumName: 'ProvidersIdEnum',
    description: 'Provider ID of the execution',
    type: String,
  })
  @IsString()
  @IsEnum(ProvidersIdEnumConst)
  providerId: ProvidersIdEnum;

  @ApiPropertyOptional({ description: 'Raw data of the execution', type: String })
  raw?: string | null;

  @ApiProperty({
    enum: [...Object.values(ExecutionDetailsSourceEnum)],
    enumName: 'ExecutionDetailsSourceEnum',
    description: 'Source of the execution detail',
    type: String,
  })
  @IsString()
  @IsEnum(ExecutionDetailsSourceEnum)
  source: ExecutionDetailsSourceEnum;
}

// Activity Notification Job Response DTO
export class ActivityNotificationJobResponseDto {
  @ApiProperty({ description: 'Unique identifier of the job', type: String })
  _id: string;

  @ApiProperty({ description: 'Type of the job', type: String })
  type: StepTypeEnum;

  @ApiPropertyOptional({
    description: 'Optional digest for the job, including metadata and events',
    type: DigestMetadataDto,
  })
  digest?: DigestMetadataDto;

  @ApiProperty({
    description: 'Execution details of the job',
    type: [ActivityNotificationExecutionDetailResponseDto],
  })
  executionDetails: ActivityNotificationExecutionDetailResponseDto[];

  @ApiProperty({
    description: 'Step details of the job',
    type: ActivityNotificationStepResponseDto,
  })
  step: ActivityNotificationStepResponseDto;

  @ApiPropertyOptional({ description: 'Optional payload for the job', type: Object })
  payload?: Record<string, unknown>;

  @ApiProperty({
    enum: [...new Set([...Object.values(ProvidersIdEnumConst).flatMap((enumObj) => Object.values(enumObj))])],
    enumName: 'ProvidersIdEnum',
    description: 'Provider ID of the job',
    type: String, // Explicit type reference for enum
  })
  providerId: ProvidersIdEnum;

  @ApiProperty({ description: 'Status of the job', type: String })
  status: string;

  @ApiPropertyOptional({ description: 'Updated time of the notification', type: String })
  updatedAt?: string;
}

// Activity Notification Subscriber Response DTO
export class ActivityNotificationSubscriberResponseDto {
  @ApiPropertyOptional({ description: 'First name of the subscriber', type: String })
  firstName?: string;

  @ApiProperty({ description: 'External unique identifier of the subscriber', type: String })
  subscriberId: string;

  @ApiProperty({ description: 'Internal to Novu unique identifier of the subscriber', type: String })
  _id: string;

  @ApiPropertyOptional({ description: 'Last name of the subscriber', type: String })
  lastName?: string;

  @ApiPropertyOptional({ description: 'Email address of the subscriber', type: String })
  email?: string;

  @ApiPropertyOptional({ description: 'Phone number of the subscriber', type: String })
  phone?: string;
}

// Notification Trigger Variable DTO
export class NotificationTriggerVariable {
  @ApiProperty({ description: 'Name of the variable', type: String })
  name: string;
}

export class NotificationTriggerDto {
  @ApiProperty({
    enum: TriggerTypeEnum,
    description: 'Type of the trigger',
    type: String, // Explicit type reference for enum
  })
  type: TriggerTypeEnum;

  @ApiProperty({ description: 'Identifier of the trigger', type: String })
  identifier: string;

  @ApiProperty({
    description: 'Variables of the trigger',
    type: [NotificationTriggerVariable],
  })
  variables: NotificationTriggerVariable[];

  @ApiPropertyOptional({
    description: 'Subscriber variables of the trigger',
    type: [NotificationTriggerVariable],
  })
  subscriberVariables?: NotificationTriggerVariable[];
}

// Activity Notification Template Response DTO
export class ActivityNotificationTemplateResponseDto {
  @ApiPropertyOptional({ description: 'Unique identifier of the template', type: String })
  _id?: string;

  @ApiProperty({ description: 'Name of the template', type: String })
  name: string;

  @ApiProperty({
    description: 'Triggers of the template',
    type: [NotificationTriggerDto],
  })
  triggers: NotificationTriggerDto[];
}

// Activity Notification Response DTO
export class ActivityNotificationResponseDto {
  @ApiPropertyOptional({ description: 'Unique identifier of the notification', type: String })
  _id?: string;

  @ApiProperty({ description: 'Environment ID of the notification', type: String })
  _environmentId: string;

  @ApiProperty({ description: 'Organization ID of the notification', type: String })
  _organizationId: string;

  @ApiProperty({ description: 'Subscriber ID of the notification', type: String })
  _subscriberId: string; // Added to align with NotificationEntity

  @ApiProperty({ description: 'Transaction ID of the notification', type: String })
  transactionId: string;

  @ApiPropertyOptional({ description: 'Template ID of the notification', type: String })
  _templateId?: string; // Added to align with NotificationEntity

  @ApiPropertyOptional({ description: 'Digested Notification ID', type: String })
  _digestedNotificationId?: string; // Added to align with NotificationEntity

  @ApiPropertyOptional({ description: 'Creation time of the notification', type: String })
  createdAt?: string;

  @ApiPropertyOptional({ description: 'Last updated time of the notification', type: String })
  updatedAt?: string; // Added to align with NotificationEntity

  @ApiPropertyOptional({
    description: 'Channels of the notification',
    enum: [...Object.values(StepTypeEnum)],
    enumName: 'StepTypeEnum',
    isArray: true,
    type: String,
  })
  channels?: StepTypeEnum[];

  @ApiPropertyOptional({
    description: 'Subscriber of the notification',
    type: ActivityNotificationSubscriberResponseDto,
  })
  subscriber?: ActivityNotificationSubscriberResponseDto;

  @ApiPropertyOptional({
    description: 'Template of the notification',
    type: ActivityNotificationTemplateResponseDto,
  })
  template?: ActivityNotificationTemplateResponseDto;

  @ApiPropertyOptional({
    description: 'Jobs of the notification',
    type: [ActivityNotificationJobResponseDto],
  })
  jobs?: ActivityNotificationJobResponseDto[];

  @ApiPropertyOptional({
    description: 'Payload of the notification',
    type: Object, // Adjust type as necessary
  })
  payload?: any; // Added to align with NotificationEntity

  @ApiPropertyOptional({
    description: 'Tags associated with the notification',
    type: [String],
  })
  tags?: string[]; // Added to align with NotificationEntity

  @ApiPropertyOptional({
    description: 'Controls associated with the notification',
    type: Object, // Adjust type as necessary
  })
  controls?: any; // Added to align with NotificationEntity

  @ApiPropertyOptional({
    description: 'To field for subscriber definition',
    type: Object, // Adjust type as necessary
  })
  to?: any; // Added to align with NotificationEntity
}
// Activities Response DTO
export class ActivitiesResponseDto {
  @ApiProperty({ description: 'Indicates if there are more activities in the result set', type: Boolean })
  hasMore: boolean;

  @ApiProperty({
    description: 'Array of activity notifications',
    type: [ActivityNotificationResponseDto],
  })
  data: ActivityNotificationResponseDto[];

  @ApiProperty({ description: 'Page size of the activities', type: Number })
  pageSize: number;

  @ApiProperty({ description: 'Current page of the activities', type: Number })
  page: number;
}
