import {
  BuilderFieldOperator,
  BuilderFieldType,
  BuilderFieldTypeEnum,
  BuilderGroupValues,
  FilterPartTypeEnum,
  PreviousStepTypeEnum,
  TimeOperatorEnum,
} from '@novu/shared';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

class BaseFilterPart {
  on: FilterPartTypeEnum;
}

class BaseFieldFilterPart extends BaseFilterPart {
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
      'IN',
    ],
  })
  operator: BuilderFieldOperator;
}

export class FieldFilterPartDto extends BaseFieldFilterPart {
  @ApiProperty({
    enum: [FilterPartTypeEnum.SUBSCRIBER, FilterPartTypeEnum.PAYLOAD],
  })
  on: FilterPartTypeEnum.SUBSCRIBER | FilterPartTypeEnum.PAYLOAD;
}

export class WebhookFilterPartDto extends BaseFieldFilterPart {
  @ApiProperty({
    enum: [FilterPartTypeEnum.WEBHOOK],
  })
  on: FilterPartTypeEnum.WEBHOOK;

  @ApiPropertyOptional()
  webhookUrl: string;
}

export class RealtimeOnlineFilterPartDto extends BaseFilterPart {
  @ApiProperty({
    enum: [FilterPartTypeEnum.IS_ONLINE],
  })
  on: FilterPartTypeEnum.IS_ONLINE;

  @ApiProperty()
  value: boolean;
}

export class OnlineInLastFilterPartDto extends BaseFilterPart {
  @ApiProperty({
    enum: [FilterPartTypeEnum.IS_ONLINE_IN_LAST],
  })
  on: FilterPartTypeEnum.IS_ONLINE_IN_LAST;

  @ApiProperty({
    enum: TimeOperatorEnum,
  })
  timeOperator: TimeOperatorEnum;

  @ApiProperty()
  value: number;
}

export class PreviousStepFilterPartDto extends BaseFilterPart {
  @ApiProperty({
    enum: [FilterPartTypeEnum.PREVIOUS_STEP],
  })
  on: FilterPartTypeEnum.PREVIOUS_STEP;

  @ApiProperty()
  step: string;

  @ApiProperty({
    enum: PreviousStepTypeEnum,
  })
  stepType: PreviousStepTypeEnum;
}

export class TenantFilterPartDto extends BaseFieldFilterPart {
  @ApiProperty({
    enum: [FilterPartTypeEnum.TENANT],
    description: 'Only on integrations right now',
  })
  on: FilterPartTypeEnum.TENANT;
}

export type FilterPartsDto =
  | FieldFilterPartDto
  | WebhookFilterPartDto
  | RealtimeOnlineFilterPartDto
  | OnlineInLastFilterPartDto
  | PreviousStepFilterPartDto
  | TenantFilterPartDto;

export class StepFilterDto {
  @ApiProperty()
  isNegated?: boolean;

  @ApiProperty({
    enum: ['BOOLEAN', 'TEXT', 'DATE', 'NUMBER', 'STATEMENT', 'LIST', 'MULTI_LIST', 'GROUP'],
    enumName: 'BuilderFieldTypeEnum',
  })
  type?: BuilderFieldType;

  @ApiProperty({
    enum: ['AND', 'OR'],
  })
  value: BuilderGroupValues;

  @ApiProperty({
    type: [
      FieldFilterPartDto,
      WebhookFilterPartDto,
      RealtimeOnlineFilterPartDto,
      OnlineInLastFilterPartDto,
      PreviousStepFilterPartDto,
      TenantFilterPartDto,
    ],
  })
  children: FilterPartsDto[];
}
