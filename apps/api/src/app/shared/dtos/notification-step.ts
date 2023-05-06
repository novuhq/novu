import { ApiExtraModels, ApiProperty, ApiPropertyOptional, getSchemaPath } from '@nestjs/swagger';
import {
  DigestUnitEnum,
  DigestTypeEnum,
  DelayTypeEnum,
  INotificationTemplateStepMetadata,
  IDigestBaseMetadata,
  IDigestRegularMetadata,
  IDigestTimedMetadata,
  IDelayRegularMetadata,
  IDelayScheduledMetadata,
  ITimedConfig,
  DaysEnum,
} from '@novu/shared';
import { IsBoolean, ValidateNested } from 'class-validator';

import { MessageTemplate } from './message-template';
import { StepFilter } from './step-filter';

class TimedConfig implements ITimedConfig {
  @ApiPropertyOptional()
  atTime?: string;

  @ApiPropertyOptional({ enum: [...Object.values(DaysEnum)], isArray: true })
  weekDays?: DaysEnum[];

  @ApiPropertyOptional()
  monthDays?: number[];

  @ApiPropertyOptional()
  ordinal?: string;

  @ApiPropertyOptional()
  ordinalValue?: string;

  @ApiPropertyOptional()
  monthlyType?: string;
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

@ApiExtraModels(TimedConfig)
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

@ApiExtraModels(DigestRegularMetadata, DigestTimedMetadata, DelayRegularMetadata, DelayScheduledMetadata)
export class NotificationStep {
  @ApiPropertyOptional()
  _id?: string;

  @ApiPropertyOptional()
  uuid?: string;

  @ApiPropertyOptional()
  name?: string;

  @ApiPropertyOptional()
  @ApiProperty()
  _templateId?: string;

  @ApiPropertyOptional()
  @IsBoolean()
  active?: boolean;

  @ApiPropertyOptional()
  shouldStopOnFail?: boolean;

  @ApiPropertyOptional({
    type: MessageTemplate,
  })
  @ValidateNested()
  template?: MessageTemplate;

  @ApiPropertyOptional({
    type: [StepFilter],
  })
  @ValidateNested({ each: true })
  filters?: StepFilter[];

  @ApiPropertyOptional()
  _parentId?: string | null;

  @ApiPropertyOptional({
    oneOf: [
      { $ref: getSchemaPath(DigestRegularMetadata) },
      { $ref: getSchemaPath(DigestTimedMetadata) },
      { $ref: getSchemaPath(DelayRegularMetadata) },
      { $ref: getSchemaPath(DelayScheduledMetadata) },
    ],
  })
  metadata?: INotificationTemplateStepMetadata;

  @ApiPropertyOptional()
  replyCallback?: {
    active: boolean;
    url: string;
  };
}
