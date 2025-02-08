import { ApiExtraModels, ApiProperty, ApiPropertyOptional, getSchemaPath } from '@nestjs/swagger';
import {
  DaysEnum,
  DelayTypeEnum,
  DigestTypeEnum,
  DigestUnitEnum,
  IDelayRegularMetadata,
  IDelayScheduledMetadata,
  IDigestBaseMetadata,
  IDigestRegularMetadata,
  IDigestTimedMetadata,
  ITimedConfig,
  IWorkflowStepMetadata,
  MonthlyTypeEnum,
  OrdinalEnum,
  OrdinalValueEnum,
  StepVariantDto,
} from '@novu/shared';
import { IsBoolean, IsString, ValidateNested } from 'class-validator';

import { Type } from 'class-transformer';
import { MessageTemplate } from './message-template';
import { StepFilterDto } from './step-filter-dto';

class TimedConfig implements ITimedConfig {
  @ApiPropertyOptional()
  atTime?: string;

  @ApiPropertyOptional({ enum: [...Object.values(DaysEnum)], isArray: true })
  weekDays?: DaysEnum[];

  @ApiPropertyOptional()
  monthDays?: number[];

  @ApiPropertyOptional({ enum: [...Object.values(OrdinalEnum)] })
  ordinal?: OrdinalEnum;

  @ApiPropertyOptional({ enum: [...Object.values(OrdinalValueEnum)] })
  ordinalValue?: OrdinalValueEnum;

  @ApiPropertyOptional({ enum: [...Object.values(MonthlyTypeEnum)] })
  monthlyType?: MonthlyTypeEnum;
}

class AmountAndUnit {
  @ApiPropertyOptional()
  amount: number;

  @ApiPropertyOptional({
    enum: [...Object.values(DigestUnitEnum)],
  })
  unit: DigestUnitEnum;
}

class DigestBaseMetadata extends AmountAndUnit implements IDigestBaseMetadata {
  @ApiPropertyOptional()
  digestKey?: string;
}

class DigestRegularMetadata extends DigestBaseMetadata implements IDigestRegularMetadata {
  @ApiProperty({ enum: [DigestTypeEnum.REGULAR, DigestTypeEnum.BACKOFF] })
  type: DigestTypeEnum.REGULAR | DigestTypeEnum.BACKOFF;

  @ApiPropertyOptional()
  backoff?: boolean;

  @ApiPropertyOptional()
  backoffAmount?: number;

  @ApiPropertyOptional({
    enum: [...Object.values(DigestUnitEnum)],
  })
  backoffUnit?: DigestUnitEnum;

  @ApiPropertyOptional()
  updateMode?: boolean;
}

class DigestTimedMetadata extends DigestBaseMetadata implements IDigestTimedMetadata {
  @ApiProperty({
    enum: [DigestTypeEnum.TIMED],
  })
  type: DigestTypeEnum.TIMED;

  @ApiPropertyOptional()
  @ValidateNested()
  timed?: TimedConfig;
}

class DelayRegularMetadata extends AmountAndUnit implements IDelayRegularMetadata {
  @ApiProperty({
    enum: [DelayTypeEnum.REGULAR],
  })
  type: DelayTypeEnum.REGULAR;
}

class DelayScheduledMetadata implements IDelayScheduledMetadata {
  @ApiProperty({
    enum: [DelayTypeEnum.SCHEDULED],
  })
  type: DelayTypeEnum.SCHEDULED;

  @ApiProperty()
  delayPath: string;
}

// Define the ReplyCallback type with OpenAPI annotations
export class ReplyCallback {
  @ApiPropertyOptional({
    description: 'Indicates whether the reply callback is active.',
    type: Boolean,
  })
  @IsBoolean()
  active: boolean;

  @ApiPropertyOptional({
    description: 'The URL to which replies should be sent.',
    type: String,
  })
  @IsString()
  url: string;
}

@ApiExtraModels(DigestRegularMetadata, DigestTimedMetadata, DelayRegularMetadata, DelayScheduledMetadata)
export class NotificationStepData implements StepVariantDto {
  @ApiPropertyOptional({
    description: 'Unique identifier for the notification step.',
    type: String,
  })
  _id?: string;

  @ApiPropertyOptional({
    description: 'Universally unique identifier for the notification step.',
    type: String,
  })
  uuid?: string;

  @ApiPropertyOptional({
    description: 'Name of the notification step.',
    type: String,
  })
  name?: string;

  @ApiPropertyOptional({
    description: 'ID of the template associated with this notification step.',
    type: String,
  })
  _templateId?: string;

  @ApiPropertyOptional({
    description: 'Indicates whether the notification step is active.',
    type: Boolean,
  })
  @IsBoolean()
  active?: boolean;

  @ApiPropertyOptional({
    description: 'Determines if the process should stop on failure.',
    type: Boolean,
  })
  shouldStopOnFail?: boolean;

  @ApiPropertyOptional({
    description: 'Message template used in this notification step.',
    type: () => MessageTemplate, // Assuming MessageTemplate is a class
  })
  @ValidateNested()
  template?: MessageTemplate;

  @ApiPropertyOptional({
    description: 'Filters applied to this notification step.',
    type: [StepFilterDto],
  })
  @ValidateNested({ each: true })
  filters?: StepFilterDto[];

  @ApiPropertyOptional({
    description: 'ID of the parent notification step, if applicable.',
    type: String,
  })
  _parentId?: string | null;

  @ApiPropertyOptional({
    description: 'Metadata associated with the workflow step. Can vary based on the type of step.',
    oneOf: [
      { $ref: getSchemaPath(DigestRegularMetadata) },
      { $ref: getSchemaPath(DigestTimedMetadata) },
      { $ref: getSchemaPath(DelayRegularMetadata) },
      { $ref: getSchemaPath(DelayScheduledMetadata) },
    ],
  })
  metadata?: IWorkflowStepMetadata;

  @ApiPropertyOptional({
    description: 'Callback information for replies, including whether it is active and the callback URL.',
    type: () => ReplyCallback,
  })
  replyCallback?: ReplyCallback;
}

export class NotificationStepDto extends NotificationStepData {
  @ApiPropertyOptional({
    type: () => [NotificationStepData], // Specify that this is an array of NotificationStepData
  })
  @ValidateNested({ each: true }) // Validate each nested variant
  @Type(() => NotificationStepData) // Transform to NotificationStepData instances
  variants?: NotificationStepData[];
}
